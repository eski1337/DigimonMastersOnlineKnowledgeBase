import { CollectionConfig } from 'payload/types';
import { createMediaRenameHook } from '../hooks/rename-media';

export const Items: CollectionConfig = {
  slug: 'items',
  labels: {
    singular: 'Item',
    plural: 'Items',
  },
  admin: {
    useAsTitle: 'name',
    group: { en: 'Game Data', zhTw: '遊戲資料' },
    defaultColumns: ['name', 'category', 'rarity', 'icon', 'published'],
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
       SIDEBAR
       ═══════════════════════════════════════════════════════════════ */
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: true,
      index: true,
      admin: { position: 'sidebar' },
    },

    /* ═══════════════════════════════════════════════════════════════
       IDENTITY — always visible above tabs
       ═══════════════════════════════════════════════════════════════ */
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          required: true,
          unique: true,
          index: true,
          admin: { width: '60%', description: 'Item name (e.g., "Option Change Stone", "Burst Mode Item")' },
        },
        {
          name: 'slug',
          type: 'text',
          required: true,
          unique: true,
          admin: { width: '40%', description: 'URL-friendly slug (auto-generated from name)' },
          hooks: {
            beforeValidate: [
              ({ data, value }: any) => {
                if (data?.name && !value) {
                  return data.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');
                }
                return value;
              },
            ],
          },
        },
      ],
    },

    /* ═══════════════════════════════════════════════════════════════
       TABS
       ═══════════════════════════════════════════════════════════════ */
    {
      type: 'tabs',
      tabs: [
        /* ── Tab 1: General ──────────────────────────────────────── */
        {
          label: 'General',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'category',
                  type: 'select',
                  required: true,
                  index: true,
                  defaultValue: 'other',
                  options: [
                    { label: 'Evolution Item', value: 'evolution' },
                    { label: 'Unlock Item', value: 'unlock' },
                    { label: 'Ride Mode Unlock', value: 'ride-mode-unlock' },
                    { label: 'Consumable', value: 'consumable' },
                    { label: 'Equipment', value: 'equipment' },
                    { label: 'Material', value: 'material' },
                    { label: 'Quest Item', value: 'quest' },
                    { label: 'Egg / Mercenary', value: 'egg' },
                    { label: 'Costume / Skin', value: 'costume' },
                    { label: 'Token / Currency', value: 'token' },
                    { label: 'Booster / Buff', value: 'booster' },
                    { label: 'Digivice', value: 'digivice' },
                    { label: 'Accessory', value: 'accessory' },
                    { label: 'Seal', value: 'seal' },
                    { label: 'Card', value: 'card' },
                    { label: 'Other', value: 'other' },
                  ],
                  admin: { width: '33%' },
                },
                {
                  name: 'rarity',
                  type: 'select',
                  index: true,
                  options: [
                    { label: 'Common', value: 'common' },
                    { label: 'Uncommon', value: 'uncommon' },
                    { label: 'Rare', value: 'rare' },
                    { label: 'Epic', value: 'epic' },
                    { label: 'Legendary', value: 'legendary' },
                    { label: 'Event', value: 'event' },
                    { label: 'Cash Shop', value: 'cash' },
                  ],
                  admin: { width: '33%' },
                },
                {
                  name: 'maxStack',
                  type: 'number',
                  admin: { width: '34%', description: 'Max stack size (blank = 1 / unstackable)' },
                },
              ],
            },
            {
              name: 'description',
              type: 'textarea',
              admin: { description: 'In-game description or usage explanation' },
            },
            {
              type: 'row',
              fields: [
                { name: 'tradeable', type: 'checkbox', defaultValue: false, admin: { width: '25%' } },
                { name: 'accountBound', type: 'checkbox', defaultValue: false, admin: { width: '25%', description: 'Cannot be traded once used' } },
                { name: 'cashShopItem', type: 'checkbox', defaultValue: false, admin: { width: '25%' } },
                { name: 'eventOnly', type: 'checkbox', defaultValue: false, admin: { width: '25%' } },
              ],
            },
          ],
        },

        /* ── Tab 2: Media ────────────────────────────────────────── */
        {
          label: 'Media',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'icon',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { width: '50%', description: 'Item icon (32×32 or 64×64)' },
                },
                {
                  name: 'image',
                  type: 'upload',
                  relationTo: 'media',
                  admin: { width: '50%', description: 'Larger image or screenshot' },
                },
              ],
            },
            {
              name: 'additionalImages',
              type: 'array',
              admin: { description: 'Extra screenshots or variant icons' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'caption', type: 'text' },
              ],
            },
          ],
        },

        /* ── Tab 3: Effects & Stats ──────────────────────────────── */
        {
          label: 'Effects',
          fields: [
            {
              name: 'effects',
              type: 'array',
              admin: { description: 'Stat boosts, buffs, or other effects this item provides' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'stat', type: 'text', admin: { width: '40%', description: 'e.g. AT, HP, Skill Damage %, EXP Boost' } },
                    { name: 'value', type: 'text', admin: { width: '30%', description: 'e.g. +500, 10%, 2x' } },
                    { name: 'duration', type: 'text', admin: { width: '30%', description: 'e.g. 30 min, Permanent, 7 days' } },
                  ],
                },
              ],
            },
            {
              name: 'cooldown',
              type: 'text',
              admin: { description: 'Cooldown between uses (e.g. "5 sec", "30 min", "24h")' },
            },
            {
              name: 'levelRequirement',
              type: 'number',
              admin: { description: 'Minimum tamer level to use this item' },
            },
          ],
        },

        /* ── Tab 4: Obtaining ────────────────────────────────────── */
        {
          label: 'Obtaining',
          fields: [
            {
              name: 'obtainMethods',
              type: 'array',
              admin: { description: 'How to get this item' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'method',
                      type: 'select',
                      options: [
                        { label: 'Drop', value: 'drop' },
                        { label: 'Quest Reward', value: 'quest' },
                        { label: 'Crafting / NPC', value: 'craft' },
                        { label: 'Cash Shop', value: 'cash' },
                        { label: 'Event', value: 'event' },
                        { label: 'Rare Machine', value: 'rare-machine' },
                        { label: 'Digital Draw', value: 'digital-draw' },
                        { label: 'Trade', value: 'trade' },
                        { label: 'Arena Reward', value: 'arena' },
                        { label: 'Dungeon Reward', value: 'dungeon' },
                        { label: 'Other', value: 'other' },
                      ],
                      admin: { width: '30%' },
                    },
                    { name: 'source', type: 'text', admin: { width: '40%', description: 'e.g. Myotismon, Nanomon NPC, Royal Base Hard' } },
                    { name: 'dropRate', type: 'text', admin: { width: '30%', description: 'e.g. ~5%, Guaranteed, Rare' } },
                  ],
                },
                { name: 'notes', type: 'text', admin: { description: 'Additional details' } },
              ],
            },
            {
              name: 'craftingRecipe',
              type: 'group',
              admin: { description: 'If this item can be crafted' },
              fields: [
                { name: 'npc', type: 'text', admin: { description: 'Crafting NPC name and location' } },
                { name: 'cost', type: 'text', admin: { description: 'Money cost (e.g. "500M", "2T")' } },
                { name: 'successRate', type: 'text', admin: { description: 'e.g. 100%, 70%, Varies' } },
                {
                  name: 'materials',
                  type: 'array',
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'item', type: 'text', required: true, admin: { width: '50%' } },
                        { name: 'amount', type: 'number', admin: { width: '25%' } },
                        { name: 'icon', type: 'upload', relationTo: 'media', admin: { width: '25%' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 5: Relations ────────────────────────────────────── */
        {
          label: 'Relations',
          fields: [
            {
              name: 'usedFor',
              type: 'textarea',
              admin: { description: 'What this item is used for (e.g. "Evolve Agumon to Greymon", "Reroll Digivice options")' },
            },
            {
              name: 'relatedDigimon',
              type: 'relationship',
              relationTo: 'digimon',
              hasMany: true,
              admin: { description: 'Digimon that use or need this item' },
            },
            {
              name: 'relatedItems',
              type: 'relationship',
              relationTo: 'items',
              hasMany: true,
              admin: { description: 'Related or similar items' },
            },
            {
              name: 'relatedGuide',
              type: 'relationship',
              relationTo: 'guides',
              admin: { description: 'Guide that covers this item in detail' },
            },
          ],
        },

        /* ── Tab 6: Notes ────────────────────────────────────────── */
        {
          label: 'Notes',
          fields: [
            { name: 'notes', type: 'richText', admin: { description: 'Additional notes, tips, or trivia' } },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      createMediaRenameHook('name', [
        { field: 'icon', suffix: 'Icon' },
        { field: 'image', suffix: 'Image' },
      ]),
    ],
  },
};

export default Items;
