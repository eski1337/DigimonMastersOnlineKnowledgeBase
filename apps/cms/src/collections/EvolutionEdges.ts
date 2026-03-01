import type { CollectionConfig } from 'payload/types';

/* ── Constants ────────────────────────────────────────────────────────── */

const EVOLUTION_TYPES = [
  { label: 'Normal', value: 'normal' },
  { label: 'Jogress / DNA', value: 'jogress' },
  { label: 'Digi-Egg', value: 'digi-egg' },
  { label: 'X-Antibody', value: 'x-antibody' },
  { label: 'Variant', value: 'variant' },
  { label: 'Alternate', value: 'alternate' },
  { label: 'Slide', value: 'slide' },
  { label: 'Mode Change', value: 'mode-change' },
] as const;

const MAX_CONDITIONS_BYTES = 5_000;
const MAX_CONDITIONS_DEPTH = 3;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/* ── Helpers ──────────────────────────────────────────────────────────── */

/** Resolve a relationship value to its string ID regardless of populated state. */
function resolveId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'id' in val) return String((val as any).id);
  return null;
}

/** Measure max nesting depth of a JSON-serialisable value. */
function jsonDepth(value: unknown, current = 0): number {
  if (current > MAX_CONDITIONS_DEPTH + 1) return current; // early exit
  if (Array.isArray(value)) {
    let max = current + 1;
    for (const item of value) max = Math.max(max, jsonDepth(item, current + 1));
    return max;
  }
  if (value !== null && typeof value === 'object') {
    let max = current + 1;
    for (const key of Object.keys(value)) {
      if (FORBIDDEN_KEYS.has(key)) continue; // will be stripped
      max = Math.max(max, jsonDepth((value as Record<string, unknown>)[key], current + 1));
    }
    return max;
  }
  return current;
}

/** Recursively strip forbidden keys from an object tree (mutates in place). */
function stripForbiddenKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripForbiddenKeys);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (FORBIDDEN_KEYS.has(key)) {
        delete obj[key];
      } else {
        obj[key] = stripForbiddenKeys(obj[key]);
      }
    }
  }
  return value;
}

/* ── Access helpers ───────────────────────────────────────────────────── */

const isAdminOrOwner = ({ req: { user } }: { req: { user: any } }): boolean => {
  if (!user) return false;
  return ['admin', 'owner'].includes(user.role);
};

const isEditorOrAbove = ({ req: { user } }: { req: { user: any } }): boolean => {
  if (!user) return false;
  return ['editor', 'admin', 'owner'].includes(user.role);
};

/* ── Collection ───────────────────────────────────────────────────────── */

const EvolutionEdges: CollectionConfig = {
  slug: 'evolution-edges',
  admin: {
    useAsTitle: 'evolutionType',
    defaultColumns: ['source', 'target', 'evolutionType', 'requiredLevel', 'updatedAt'],
    group: { en: 'Game Data', zh: '遊戲資料' },
    description: 'Directed edges in the evolution graph. Each edge represents one evolution path between two Digimon.',
  },
  access: {
    read: () => true,
    create: isEditorOrAbove,
    update: isEditorOrAbove,
    delete: isAdminOrOwner,
  },
  fields: [
    /* ── Endpoints ─────────────────────────────────────────────── */
    {
      type: 'row',
      fields: [
        {
          name: 'source',
          label: 'Source Digimon',
          type: 'relationship',
          relationTo: 'digimon',
          required: true,
          index: true,
          admin: {
            width: '50%',
            description: 'The Digimon this edge starts from (pre-evolution)',
          },
        },
        {
          name: 'target',
          label: 'Target Digimon',
          type: 'relationship',
          relationTo: 'digimon',
          required: true,
          index: true,
          admin: {
            width: '50%',
            description: 'The Digimon this edge leads to (post-evolution)',
          },
        },
      ],
    },

    /* ── Edge metadata ─────────────────────────────────────────── */
    {
      type: 'row',
      fields: [
        {
          name: 'evolutionType',
          label: 'Evolution Type',
          type: 'select',
          required: true,
          defaultValue: 'normal',
          options: [...EVOLUTION_TYPES],
          admin: { width: '34%' },
        },
        {
          name: 'requiredLevel',
          label: 'Required Level',
          type: 'number',
          min: 1,
          max: 999,
          admin: {
            width: '33%',
            description: 'Minimum Digimon level to evolve',
          },
        },
        {
          name: 'requiredItem',
          label: 'Required Item',
          type: 'text',
          admin: {
            width: '33%',
            description: 'Item name required for this evolution',
          },
        },
      ],
    },

    /* ── Jogress-specific ──────────────────────────────────────── */
    {
      name: 'jogressPartner',
      label: 'Jogress Partner',
      type: 'relationship',
      relationTo: 'digimon',
      admin: {
        description: 'Required partner Digimon for Jogress/DNA evolution',
        condition: (_data, siblingData) => siblingData?.evolutionType === 'jogress',
      },
    },

    /* ── Conditions (flexible JSON) ────────────────────────────── */
    {
      name: 'conditions',
      label: 'Additional Conditions',
      type: 'json',
      admin: {
        description: 'Optional structured conditions (max 5KB, max 3 levels deep)',
      },
      validate: (value: unknown): true | string => {
        if (value === null || value === undefined) return true;

        // Size check
        let serialized: string;
        try {
          serialized = JSON.stringify(value);
        } catch {
          return 'Conditions must be valid JSON';
        }
        if (serialized.length > MAX_CONDITIONS_BYTES) {
          return `Conditions JSON must be under ${MAX_CONDITIONS_BYTES} bytes (got ${serialized.length})`;
        }

        // Depth check
        const depth = jsonDepth(value);
        if (depth > MAX_CONDITIONS_DEPTH) {
          return `Conditions JSON nesting too deep (max ${MAX_CONDITIONS_DEPTH} levels, got ${depth})`;
        }

        // Forbidden keys check
        if (FORBIDDEN_KEYS.size > 0) {
          for (const key of FORBIDDEN_KEYS) {
            if (serialized.includes(`"${key}"`)) {
              return `Conditions JSON contains forbidden key: "${key}"`;
            }
          }
        }

        return true;
      },
    },
  ],

  hooks: {
    beforeValidate: [
      /** Prevent self-loop edges (source === target). */
      ({ data }) => {
        if (!data) return data;

        const sourceId = resolveId(data.source);
        const targetId = resolveId(data.target);

        if (sourceId && targetId && sourceId === targetId) {
          throw new Error('Self-loop edges are not allowed: source and target must be different Digimon');
        }

        return data;
      },
    ],
    beforeChange: [
      /** Strip forbidden keys from conditions before persisting. */
      ({ data }) => {
        if (data?.conditions && typeof data.conditions === 'object') {
          data.conditions = stripForbiddenKeys(
            JSON.parse(JSON.stringify(data.conditions)),
          );
        }
        return data;
      },
    ],
  },
};

export default EvolutionEdges;
