import { CollectionConfig } from 'payload/types';
import {
  DIGIMON_ELEMENTS,
  DIGIMON_ATTRIBUTES,
  DIGIMON_RANKS,
  DIGIMON_FAMILIES,
  DIGIMON_FORMS,
  DIGIMON_ATTACKER_TYPES,
} from '@dmo-kb/shared';
import ImportButton from '../components/ImportButton';

/* ── Reusable stat row (4 per row via 25% width) ─────────────────── */
const statFields = (prefix?: string) => [
  { name: 'hp', label: 'HP', type: 'number' as const, admin: { width: '25%' } },
  { name: 'at', label: 'AT', type: 'number' as const, admin: { width: '25%' } },
  { name: 'de', label: 'DE', type: 'number' as const, admin: { width: '25%' } },
  { name: 'as', label: 'AS', type: 'number' as const, admin: { width: '25%' } },
  { name: 'ds', label: 'DS', type: 'number' as const, admin: { width: '25%' } },
  { name: 'ct', label: 'CT', type: 'number' as const, admin: { width: '25%' } },
  { name: 'ht', label: 'HT', type: 'number' as const, admin: { width: '25%' } },
  { name: 'ev', label: 'EV', type: 'number' as const, admin: { width: '25%' } },
];

const Digimon: CollectionConfig = {
  slug: 'digimon',
  labels: {
    singular: 'Digimon',
    plural: 'Digimon',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'form', 'rank', 'element', 'attribute', 'published'],
    group: 'Game Data',
    components: {
      BeforeListTable: [ImportButton],
    },
  },
  access: {
    read: () => true,
    create: ({ req: { user } }) => {
      if (!user) return false;
      return ['editor', 'admin', 'owner'].includes(user.role);
    },
    update: ({ req: { user } }) => {
      if (!user) return false;
      return ['editor', 'admin', 'owner'].includes(user.role);
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
  },
  fields: [
    /* ═══════════════════════════════════════════════════════════════
       PUBLISHED TOGGLE — always visible at the very top
       ═══════════════════════════════════════════════════════════════ */
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Toggle to make this Digimon visible on the website',
      },
    },

    /* ═══════════════════════════════════════════════════════════════
       IDENTITY — name + slug always visible above tabs
       ═══════════════════════════════════════════════════════════════ */
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { width: '50%' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        width: '50%',
        description: 'URL-friendly identifier',
      },
    },

    /* ═══════════════════════════════════════════════════════════════
       TABS — all remaining fields organised into logical groups
       ═══════════════════════════════════════════════════════════════ */
    {
      type: 'tabs',
      tabs: [
        /* ── Tab 1: Core Info ──────────────────────────────────── */
        {
          label: 'Core',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'form',
                  label: 'Form / Stage',
                  type: 'select',
                  required: true,
                  options: DIGIMON_FORMS.map((f: string) => ({ label: f, value: f })),
                  admin: { width: '25%', description: 'Rookie, Champion, Ultimate …' },
                },
                {
                  name: 'rank',
                  type: 'select',
                  options: DIGIMON_RANKS.map((r: string) => ({ label: r, value: r })),
                  admin: { width: '25%', description: 'N / A / S / SS / SSS / U' },
                },
                {
                  name: 'attribute',
                  type: 'select',
                  required: true,
                  options: DIGIMON_ATTRIBUTES.map((a: string) => ({ label: a, value: a })),
                  admin: { width: '25%' },
                },
                {
                  name: 'element',
                  type: 'select',
                  required: true,
                  options: DIGIMON_ELEMENTS.map((e: string) => ({ label: e, value: e })),
                  admin: { width: '25%' },
                },
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'type',
                  label: 'Type',
                  type: 'text',
                  admin: { width: '33%', description: 'Holy Knight, Dragon, Beast …' },
                },
                {
                  name: 'attackerType',
                  label: 'Attacker Type',
                  type: 'select',
                  options: DIGIMON_ATTACKER_TYPES.map((t: string) => ({ label: t, value: t })),
                  admin: { width: '33%', description: 'QA / SA / NA / DE' },
                },
                {
                  name: 'families',
                  type: 'select',
                  hasMany: true,
                  options: DIGIMON_FAMILIES.map((f: string) => ({ label: f, value: f })),
                  admin: { width: '34%' },
                },
              ],
            },
            {
              name: 'introduction',
              label: 'Introduction',
              type: 'textarea',
              admin: { description: 'Brief introduction or lore about this Digimon' },
            },
          ],
        },

        /* ── Tab 2: Media ──────────────────────────────────────── */
        {
          label: 'Media',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'icon',
                  label: 'Icon',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { width: '50%', description: 'Small icon (e.g. Falcomon_Icon.png)' },
                },
                {
                  name: 'mainImage',
                  label: 'Main Image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { width: '50%', description: 'Main sprite / artwork' },
                },
              ],
            },
            {
              name: 'images',
              type: 'array',
              label: 'Additional Images',
              admin: { description: 'Extra images or variant artwork' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },

        /* ── Tab 3: Localization ───────────────────────────────── */
        {
          label: 'Names',
          fields: [
            {
              name: 'names',
              label: 'Localized Names',
              type: 'group',
              admin: { description: 'Translations of this Digimon\'s name' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'japanese', label: 'Japanese (日本語)', type: 'text', admin: { width: '50%' } },
                    { name: 'katakana', label: 'Katakana (カタカナ)', type: 'text', admin: { width: '50%' } },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    { name: 'korean', label: 'Korean (한국어)', type: 'text', admin: { width: '33%' } },
                    { name: 'chinese', label: 'Chinese (中文)', type: 'text', admin: { width: '33%' } },
                    { name: 'thai', label: 'Thai (ไทย)', type: 'text', admin: { width: '34%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 4: Stats ──────────────────────────────────────── */
        {
          label: 'Stats',
          fields: [
            {
              name: 'stats',
              label: 'Base Stats',
              type: 'group',
              admin: { description: 'Starting values' },
              fields: statFields(),
            },
            {
              name: 'maxStats',
              label: 'Max Stats (100% Size, Lv 140)',
              type: 'group',
              admin: { description: 'Maximum values at 100% size and level 140' },
              fields: statFields(),
            },
            {
              name: 'sizePct',
              label: 'Size %',
              type: 'number',
              admin: { width: '25%', description: '100 = normal size' },
            },
          ],
        },

        /* ── Tab 5: Skills ─────────────────────────────────────── */
        {
          label: 'Skills',
          fields: [
            {
              name: 'skills',
              type: 'array',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
                    {
                      name: 'type',
                      type: 'select',
                      options: [
                        { label: 'Attack', value: 'Attack' },
                        { label: 'Support', value: 'Support' },
                        { label: 'Passive', value: 'Passive' },
                      ],
                      admin: { width: '30%' },
                    },
                    { name: 'element', label: 'Attribute', type: 'text', admin: { width: '30%' } },
                  ],
                },
                {
                  name: 'icon',
                  label: 'Skill Icon',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: 'Skill icon from DMO Wiki' },
                },
                { name: 'description', type: 'textarea' },
                {
                  type: 'row',
                  fields: [
                    { name: 'cooldown', label: 'Cooldown (s)', type: 'number', admin: { width: '25%' } },
                    { name: 'dsConsumption', label: 'DS Cost', type: 'number', admin: { width: '25%' } },
                    { name: 'skillPointsPerUpgrade', label: 'SP / Upgrade', type: 'number', admin: { width: '25%' } },
                    { name: 'animationTime', label: 'Anim Time (s)', type: 'number', admin: { width: '25%' } },
                  ],
                },
                {
                  name: 'damagePerLevel',
                  label: 'Damage per Level (1-25)',
                  type: 'textarea',
                  admin: { description: 'Damage values for each skill level' },
                },
              ],
            },
          ],
        },

        /* ── Tab 6: Evolution ──────────────────────────────────── */
        {
          label: 'Evolution',
          fields: [
            {
              name: 'digivolutions',
              label: 'Digivolution Chains',
              type: 'group',
              fields: [
                {
                  name: 'digivolvesFrom',
                  label: 'Digivolves From',
                  type: 'array',
                  admin: { description: 'Previous evolution stages' },
                  fields: [
                    { name: 'name', label: 'Digimon Name', type: 'text', required: true },
                    { name: 'requirements', type: 'textarea', admin: { description: 'Level / stats / items' } },
                  ],
                },
                {
                  name: 'digivolvesTo',
                  label: 'Digivolves To',
                  type: 'array',
                  admin: { description: 'Next evolution stages' },
                  fields: [
                    { name: 'name', label: 'Digimon Name', type: 'text', required: true },
                    {
                      type: 'row',
                      fields: [
                        { name: 'requiredLevel', label: 'Required Level', type: 'number', admin: { width: '50%' } },
                        { name: 'requiredItem', label: 'Required Item', type: 'text', admin: { width: '50%' } },
                      ],
                    },
                  ],
                },
                {
                  name: 'jogress',
                  label: 'Jogress / DNA Digivolution',
                  type: 'array',
                  admin: { description: 'DNA Digivolution partners' },
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'partner', type: 'relationship', relationTo: 'digimon', required: true, admin: { width: '50%' } },
                        { name: 'result', type: 'relationship', relationTo: 'digimon', required: true, admin: { width: '50%' } },
                      ],
                    },
                    { name: 'requirements', type: 'textarea' },
                  ],
                },
              ],
            },
            {
              name: 'requiredToEvolve',
              label: 'Evolution Requirements',
              type: 'textarea',
              admin: { description: 'Items / stats needed for evolution' },
            },
            {
              name: 'variants',
              label: 'Variants / Alternative Forms',
              type: 'array',
              admin: { description: 'Seasonal variants or alternate appearances' },
              fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'description', type: 'textarea' },
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
            {
              name: 'evolutionLine',
              type: 'relationship',
              relationTo: 'evolution-lines',
              admin: { description: 'Shared evolution line this Digimon belongs to' },
            },
            {
              name: 'visualEvolutionLayout',
              type: 'json',
              admin: { description: 'Visual evolution tree layout (JSON)' },
            },
          ],
        },

        /* ── Tab 7: Availability ───────────────────────────────── */
        {
          label: 'Availability',
          fields: [
            {
              name: 'obtain',
              type: 'textarea',
              admin: { description: 'How to obtain this Digimon' },
            },
            {
              type: 'row',
              fields: [
                { name: 'unlockedAtLevel', label: 'Unlock Level', type: 'number', admin: { width: '50%', description: 'Tamer level required' } },
                { name: 'unlockedWithItem', label: 'Unlock Item', type: 'text', admin: { width: '50%', description: 'e.g. Mercenary Egg' } },
              ],
            },
            {
              name: 'availability',
              label: 'Availability Flags',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'canBeHatched', label: 'Can Be Hatched', type: 'checkbox', defaultValue: false, admin: { width: '33%' } },
                    { name: 'available', label: 'Currently Available', type: 'checkbox', defaultValue: true, admin: { width: '33%' } },
                    { name: 'limitedTime', label: 'Limited Time', type: 'checkbox', defaultValue: false, admin: { width: '34%' } },
                  ],
                },
              ],
            },
            {
              name: 'rideability',
              label: 'Ride System',
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'canBeRidden', label: 'Can Be Ridden', type: 'checkbox', defaultValue: false, admin: { width: '33%' } },
                    { name: 'rideableWithItem', label: 'Ride Item', type: 'text', admin: { width: '33%' } },
                    { name: 'rideSpeed', label: 'Ride Speed %', type: 'number', admin: { width: '34%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 8: Notes & Sources ────────────────────────────── */
        {
          label: 'Notes',
          fields: [
            { name: 'notes', type: 'richText' },
            {
              name: 'sources',
              type: 'array',
              fields: [{ name: 'source', type: 'text' }],
            },
          ],
        },
      ],
    },
  ],
};

export default Digimon;
