import { CollectionConfig } from 'payload/types';
import MapSearchField from '../components/MapSearchField';

const Maps: CollectionConfig = {
  slug: 'maps',
  labels: {
    singular: 'Map',
    plural: 'Maps',
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'world', 'area', 'mapType', 'published'],
    group: 'Content',
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
       PUBLISHED TOGGLE — always visible in the sidebar
       ═══════════════════════════════════════════════════════════════ */
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Toggle to make this Map visible on the website',
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
        /* ── Tab 1: General ──────────────────────────────────── */
        {
          label: 'General',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'world', type: 'select', options: [
                  { label: 'Real World', value: 'real-world' },
                  { label: 'Digital World', value: 'digital-world' },
                ], required: true, admin: { width: '25%' } },
                { name: 'area', type: 'select', options: [
                  // Real World areas
                  { label: 'Yokohama Village', value: 'yokohama-village' },
                  { label: 'DATS Center', value: 'dats-center' },
                  { label: 'Shinjuku', value: 'shinjuku' },
                  { label: 'Shinjuku (D-Reaper)', value: 'shinjuku-d-reaper' },
                  { label: 'Tokyo Odaiba', value: 'tokyo-odaiba' },
                  // Digital World areas
                  { label: 'Western Area', value: 'western-area' },
                  { label: 'Glacier Area', value: 'glacier-area' },
                  { label: 'Digimon Frontier', value: 'digimon-frontier' },
                  { label: 'New Digital World', value: 'new-digital-world' },
                  { label: 'D-Terminal', value: 'd-terminal' },
                  { label: 'Digital Area', value: 'digital-area' },
                  { label: 'Spiral Mountain', value: 'spiral-mountain' },
                  { label: 'File Island', value: 'file-island' },
                  { label: 'Server Continent', value: 'server-continent' },
                  { label: 'Xros Wars', value: 'xros-wars' },
                  { label: 'Four Holy Beasts', value: 'four-holy-beasts' },
                  { label: 'Shadow Labyrinth', value: 'shadow-labyrinth' },
                  { label: 'Kaisers Domain', value: 'kaisers-domain' },
                ], required: true, admin: { width: '25%' } },
                { name: 'mapType', type: 'select', options: [
                  { label: 'Town / Hub', value: 'town' },
                  { label: 'Field / Zone', value: 'field' },
                  { label: 'Dungeon', value: 'dungeon' },
                  { label: 'Raid', value: 'raid' },
                  { label: 'Event', value: 'event' },
                  { label: 'Instance', value: 'instance' },
                ], admin: { width: '25%' } },
                { name: 'levelRange', type: 'text', admin: { width: '25%', description: 'e.g. 1-10, 45-55' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'region', type: 'text', admin: { width: '50%', description: 'Legacy field — use area select above instead' } },
                { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { width: '50%', description: 'Order within its area group (lower = first)' } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'hexCol', type: 'number', admin: { width: '50%', description: 'Honeycomb grid column (0-based). Leave blank for auto-layout.' } },
                { name: 'hexRow', type: 'number', admin: { width: '50%', description: 'Honeycomb grid row (0-based). Leave blank for auto-layout.' } },
              ],
            },
            {
              name: 'description',
              type: 'textarea',
              admin: { description: 'Brief description or lore about this map' },
            },
          ],
        },

        /* ── Tab 2: Media ────────────────────────────────────── */
        {
          label: 'Media',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'image', label: 'Main Image', type: 'upload', relationTo: 'media', admin: { width: '50%', description: 'Primary map image (e.g. loading screen)' } },
                { name: 'mapImage', label: 'Map Overlay', type: 'upload', relationTo: 'media', admin: { width: '50%', description: 'Top-down map/minimap image' } },
              ],
            },
            {
              name: 'gallery',
              label: 'Gallery / Screenshots',
              type: 'array',
              admin: { description: 'Extra screenshots or artwork' },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'caption', type: 'text' },
              ],
            },
          ],
        },

        /* ── Tab 3: NPCs ─────────────────────────────────────── */
        {
          label: 'NPCs',
          fields: [
            {
              name: 'npcs',
              type: 'array',
              labels: { singular: 'NPC', plural: 'NPCs' },
              admin: { description: 'Non-player characters found in this map' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'role', type: 'text', admin: { width: '40%', description: 'e.g. DATS Leader, Digicore Merchant' } },
                    { name: 'icon', type: 'upload', relationTo: 'media', admin: { width: '20%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 4: Wild Digimon ─────────────────────────────── */
        {
          label: 'Wild Digimon',
          fields: [
            {
              name: 'wildDigimon',
              type: 'array',
              labels: { singular: 'Wild Digimon', plural: 'Wild Digimon' },
              admin: { description: 'Wild Digimon that spawn in this map' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '20%' } },
                    { name: 'variant', type: 'text', admin: { width: '15%', description: 'e.g. Leader, Raid, Dismantler' } },
                    { name: 'behavior', type: 'select', options: [
                      { label: 'Defensive (Normal)', value: 'defensive' },
                      { label: 'Aggressive (Hostile)', value: 'aggressive' },
                    ], defaultValue: 'defensive', admin: { width: '12%' } },
                    { name: 'hp', type: 'number', admin: { width: '10%', description: 'Health Points' } },
                    { name: 'level', type: 'text', admin: { width: '10%' } },
                    { name: 'element', type: 'text', admin: { width: '15%' } },
                    { name: 'attribute', type: 'text', admin: { width: '18%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 5: Drops ────────────────────────────────────── */
        {
          label: 'Drops',
          fields: [
            {
              name: 'drops',
              type: 'array',
              labels: { singular: 'Drop', plural: 'Drops' },
              admin: { description: 'Items dropped by monsters in this map' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'monster', type: 'text', required: true, admin: { width: '30%', description: 'Monster that drops this item' } },
                    { name: 'item', type: 'text', required: true, admin: { width: '30%' } },
                    { name: 'quantity', type: 'text', admin: { width: '15%', description: 'e.g. 1-3x' } },
                    { name: 'icon', type: 'upload', relationTo: 'media', admin: { width: '25%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 6: Connections ──────────────────────────────── */
        {
          label: 'Connections',
          fields: [
            {
              name: 'portals',
              label: 'Connected Maps / Portals',
              type: 'array',
              admin: { description: 'Maps connected to this one via portals or transitions' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'destination',
                      type: 'text',
                      required: true,
                      admin: {
                        width: '40%',
                        description: 'Type to search maps — selecting auto-fills the slug',
                        components: {
                          Field: MapSearchField,
                        },
                      },
                    },
                    { name: 'destinationSlug', type: 'text', admin: { width: '35%', description: 'Slug for linking. Leave empty if no page exists.' } },
                    { name: 'requirements', type: 'text', admin: { width: '25%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 7: Bosses ───────────────────────────────────── */
        {
          label: 'Bosses',
          fields: [
            {
              name: 'bosses',
              label: 'Bosses',
              type: 'array',
              labels: { singular: 'Boss', plural: 'Bosses' },
              admin: { description: 'Raid bosses or boss encounters in this map' },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'level', type: 'text', admin: { width: '20%' } },
                    { name: 'hp', type: 'text', admin: { width: '20%', description: 'e.g. 1,500,000' } },
                    { name: 'element', type: 'text', admin: { width: '20%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 8: Notes ────────────────────────────────────── */
        {
          label: 'Notes',
          fields: [
            { name: 'notes', type: 'richText' },
          ],
        },
      ],
    },
  ],
};

export default Maps;
