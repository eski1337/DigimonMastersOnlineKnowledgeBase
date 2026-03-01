import type { CollectionConfig } from 'payload/types';

/* ── Constants ────────────────────────────────────────────────────────── */

const MAX_NODES = 1000;

/* ── Validators ───────────────────────────────────────────────────────── */

/**
 * Validate the `nodes` JSON field.
 * Expected shape: { [digimonId: string]: { x: number, y: number } }
 */
function validateNodes(value: unknown): true | string {
  if (value === null || value === undefined) return true;

  if (typeof value !== 'object' || Array.isArray(value)) {
    return 'Nodes must be an object mapping Digimon IDs to { x, y } positions';
  }

  const entries = Object.entries(value as Record<string, unknown>);

  if (entries.length > MAX_NODES) {
    return `Nodes object exceeds maximum of ${MAX_NODES} entries (got ${entries.length})`;
  }

  for (const [key, pos] of entries) {
    if (!key || typeof key !== 'string') {
      return `Invalid node key: "${key}"`;
    }

    // Allow metadata keys (e.g. __edgeHandles) without position validation
    if (key.startsWith('__')) continue;

    if (pos === null || typeof pos !== 'object' || Array.isArray(pos)) {
      return `Node "${key}" must be an object with x and y properties`;
    }

    const { x, y } = pos as Record<string, unknown>;

    if (typeof x !== 'number' || !Number.isFinite(x)) {
      return `Node "${key}": x must be a finite number`;
    }
    if (typeof y !== 'number' || !Number.isFinite(y)) {
      return `Node "${key}": y must be a finite number`;
    }
  }

  return true;
}

/**
 * Validate the `viewport` JSON field.
 * Expected shape: { x: number, y: number, zoom: number }
 */
function validateViewport(value: unknown): true | string {
  if (value === null || value === undefined) return true;

  if (typeof value !== 'object' || Array.isArray(value)) {
    return 'Viewport must be an object with x, y, and zoom properties';
  }

  const { x, y, zoom } = value as Record<string, unknown>;

  if (typeof x !== 'number' || !Number.isFinite(x)) {
    return 'Viewport x must be a finite number';
  }
  if (typeof y !== 'number' || !Number.isFinite(y)) {
    return 'Viewport y must be a finite number';
  }
  if (typeof zoom !== 'number' || !Number.isFinite(zoom)) {
    return 'Viewport zoom must be a finite number';
  }
  if (zoom < 0.1 || zoom > 10) {
    return 'Viewport zoom must be between 0.1 and 10';
  }

  return true;
}

/* ── Access helpers ───────────────────────────────────────────────────── */

const isEditorOrAbove = ({ req: { user } }: { req: { user: any } }): boolean => {
  if (!user) return false;
  return ['editor', 'admin', 'owner'].includes(user.role);
};

const isAdminOrOwner = ({ req: { user } }: { req: { user: any } }): boolean => {
  if (!user) return false;
  return ['admin', 'owner'].includes(user.role);
};

/* ── Collection ───────────────────────────────────────────────────────── */

const EvolutionGraphLayouts: CollectionConfig = {
  slug: 'evolution-graph-layouts',
  admin: {
    useAsTitle: 'rootDigimon',
    defaultColumns: ['rootDigimon', 'updatedAt'],
    group: { en: 'Game Data', zh: '遊戲資料' },
    description: 'Stores manually arranged node positions and viewport state for evolution graphs.',
  },
  access: {
    read: () => true,
    create: isEditorOrAbove,
    update: isEditorOrAbove,
    delete: isAdminOrOwner,
  },
  fields: [
    {
      name: 'rootDigimon',
      label: 'Root Digimon',
      type: 'relationship',
      relationTo: 'digimon',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'The Digimon this layout is anchored to (one layout per Digimon)',
      },
    },
    {
      name: 'nodes',
      label: 'Node Positions',
      type: 'json',
      admin: {
        description: 'Map of Digimon IDs to { x, y } coordinates. Max 1000 entries.',
      },
      validate: validateNodes,
    },
    {
      name: 'viewport',
      label: 'Viewport State',
      type: 'json',
      admin: {
        description: 'Saved viewport: { x, y, zoom }',
      },
      validate: validateViewport,
    },
  ],
};

export default EvolutionGraphLayouts;
