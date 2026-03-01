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
    group: { en: 'Content', zh: '內容' },
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
      label: { en: 'Published', zh: '已發佈' },
      admin: {
        position: 'sidebar',
        description: { en: 'Toggle to make this Map visible on the website', zh: '切換以在網站上顯示此地圖' },
      },
    },

    /* ═══════════════════════════════════════════════════════════════
       IDENTITY — name + slug always visible above tabs
       ═══════════════════════════════════════════════════════════════ */
    {
      name: 'name',
      label: { en: 'Name', zh: '名稱' },
      type: 'text',
      required: true,
      admin: { width: '50%' },
    },
    {
      name: 'slug',
      label: { en: 'Slug', zh: '網址代稱' },
      type: 'text',
      required: true,
      unique: true,
      admin: {
        width: '50%',
        description: { en: 'URL-friendly identifier', zh: '網址友善識別碼' },
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
          label: { en: 'General', zh: '一般' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'world', label: { en: 'World', zh: '世界' }, type: 'select', options: [
                  { label: { en: 'Real World', zh: '現實世界' }, value: 'real-world' },
                  { label: { en: 'Digital World', zh: '數碼世界' }, value: 'digital-world' },
                ], required: true, admin: { width: '25%' } },
                { name: 'area', label: { en: 'Area', zh: '區域' }, type: 'select', options: [
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
                { name: 'mapType', label: { en: 'Map Type', zh: '地圖類型' }, type: 'select', options: [
                  { label: { en: 'Town / Hub', zh: '城鎮 / 樞紐' }, value: 'town' },
                  { label: { en: 'Field / Zone', zh: '野外 / 區域' }, value: 'field' },
                  { label: { en: 'Dungeon', zh: '副本' }, value: 'dungeon' },
                  { label: { en: 'Raid', zh: '團隊副本' }, value: 'raid' },
                  { label: { en: 'Event', zh: '活動' }, value: 'event' },
                  { label: { en: 'Instance', zh: '實例' }, value: 'instance' },
                ], admin: { width: '25%' } },
                { name: 'levelRange', label: { en: 'Level Range', zh: '等級範圍' }, type: 'text', admin: { width: '25%', description: { en: 'e.g. 1-10, 45-55', zh: '例如 1-10、45-55' } } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'region', label: { en: 'Region', zh: '地區' }, type: 'text', admin: { width: '50%', description: { en: 'Legacy field — use area select above instead', zh: '舊欄位 — 請改用上方的區域選擇' } } },
                { name: 'sortOrder', label: { en: 'Sort Order', zh: '排序順序' }, type: 'number', defaultValue: 0, admin: { width: '50%', description: { en: 'Order within its area group (lower = first)', zh: '在區域群組中的排序（數字越小越前面）' } } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'hexCol', label: { en: 'Hex Col', zh: '六角欄' }, type: 'number', admin: { width: '50%', description: { en: 'Honeycomb grid column (0-based). Leave blank for auto-layout.', zh: '蜂巢網格欄位（從 0 開始）。留空則自動排列。' } } },
                { name: 'hexRow', label: { en: 'Hex Row', zh: '六角列' }, type: 'number', admin: { width: '50%', description: { en: 'Honeycomb grid row (0-based). Leave blank for auto-layout.', zh: '蜂巢網格列位（從 0 開始）。留空則自動排列。' } } },
              ],
            },
            {
              name: 'description',
              label: { en: 'Description', zh: '描述' },
              type: 'textarea',
              admin: { description: { en: 'Brief description or lore about this map', zh: '關於此地圖的簡要描述或背景故事' } },
            },
          ],
        },

        /* ── Tab 2: Media ────────────────────────────────────── */
        {
          label: { en: 'Media', zh: '媒體' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'image', label: { en: 'Main Image', zh: '主要圖片' }, type: 'upload', relationTo: 'media', admin: { width: '50%', description: { en: 'Primary map image (e.g. loading screen)', zh: '地圖主要圖片（例如載入畫面）' } } },
                { name: 'mapImage', label: { en: 'Map Overlay', zh: '地圖覆蓋' }, type: 'upload', relationTo: 'media', admin: { width: '50%', description: { en: 'Top-down map/minimap image', zh: '俯視地圖 / 小地圖圖片' } } },
              ],
            },
            {
              name: 'gallery',
              label: { en: 'Gallery / Screenshots', zh: '圖庫 / 截圖' },
              type: 'array',
              admin: { description: { en: 'Extra screenshots or artwork', zh: '額外的截圖或美術圖' } },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'caption', label: { en: 'Caption', zh: '說明文字' }, type: 'text' },
              ],
            },
          ],
        },

        /* ── Tab 3: NPCs ─────────────────────────────────────── */
        {
          label: { en: 'NPCs', zh: 'NPC' },
          fields: [
            {
              name: 'npcs',
              type: 'array',
              labels: { singular: 'NPC', plural: 'NPC' },
              admin: { description: { en: 'Non-player characters found in this map', zh: '此地圖中的非玩家角色' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'role', label: { en: 'Role', zh: '角色' }, type: 'text', admin: { width: '40%', description: { en: 'e.g. DATS Leader, Digicore Merchant', zh: '例如 DATS 隊長、數碼核心商人' } } },
                    { name: 'icon', type: 'upload', relationTo: 'media', admin: { width: '20%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 4: Wild Digimon ─────────────────────────────── */
        {
          label: { en: 'Wild Digimon', zh: '野生數碼獸' },
          fields: [
            {
              name: 'wildDigimon',
              type: 'array',
              labels: { singular: { en: 'Wild Digimon', zh: '野生數碼獸' }, plural: { en: 'Wild Digimon', zh: '野生數碼獸' } },
              admin: { description: { en: 'Wild Digimon that spawn in this map', zh: '此地圖中出現的野生數碼獸' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '20%' } },
                    { name: 'variant', label: { en: 'Variant', zh: '變體' }, type: 'text', admin: { width: '15%', description: { en: 'e.g. Leader, Raid, Dismantler', zh: '例如 首領、團隊、拆解者' } } },
                    { name: 'behavior', label: { en: 'Behavior', zh: '行為' }, type: 'select', options: [
                      { label: { en: 'Defensive (Normal)', zh: '防禦型（普通）' }, value: 'defensive' },
                      { label: { en: 'Aggressive (Hostile)', zh: '攻擊型（敵對）' }, value: 'aggressive' },
                    ], defaultValue: 'defensive', admin: { width: '12%' } },
                    { name: 'hp', label: { en: 'HP', zh: 'HP' }, type: 'number', admin: { width: '10%', description: { en: 'Health Points', zh: '生命值' } } },
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
          label: { en: 'Drops', zh: '掉落物' },
          fields: [
            {
              name: 'drops',
              type: 'array',
              labels: { singular: { en: 'Drop', zh: '掉落物' }, plural: { en: 'Drops', zh: '掉落物' } },
              admin: { description: { en: 'Items dropped by monsters in this map', zh: '此地圖中怪物掉落的道具' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'monster', label: { en: 'Monster', zh: '怪物' }, type: 'text', required: true, admin: { width: '30%', description: { en: 'Monster that drops this item', zh: '掉落此道具的怪物' } } },
                    { name: 'item', label: { en: 'Item', zh: '道具' }, type: 'text', required: true, admin: { width: '30%' } },
                    { name: 'quantity', label: { en: 'Quantity', zh: '數量' }, type: 'text', admin: { width: '15%', description: { en: 'e.g. 1-3x', zh: '例如 1-3x' } } },
                    { name: 'icon', type: 'upload', relationTo: 'media', admin: { width: '25%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 6: Connections ──────────────────────────────── */
        {
          label: { en: 'Connections', zh: '連接' },
          fields: [
            {
              name: 'portals',
              label: { en: 'Connected Maps / Portals', zh: '連接地圖 / 傳送門' },
              type: 'array',
              admin: { description: { en: 'Maps connected to this one via portals or transitions', zh: '透過傳送門或通道連接到此地圖的其他地圖' } },
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
                        description: { en: 'Type to search maps — selecting auto-fills the slug', zh: '輸入以搜尋地圖 — 選擇後自動填入代稱' },
                        components: {
                          Field: MapSearchField,
                        },
                      },
                    },
                    { name: 'destinationSlug', label: { en: 'Destination Slug', zh: '目的地代稱' }, type: 'text', admin: { width: '35%', description: { en: 'Slug for linking. Leave empty if no page exists.', zh: '用於連結的代稱。若無頁面則留空。' } } },
                    { name: 'requirements', label: { en: 'Requirements', zh: '需求條件' }, type: 'text', admin: { width: '25%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 7: Bosses ───────────────────────────────────── */
        {
          label: { en: 'Bosses', zh: '首領' },
          fields: [
            {
              name: 'bosses',
              label: { en: 'Bosses', zh: '首領' },
              type: 'array',
              labels: { singular: { en: 'Boss', zh: '首領' }, plural: { en: 'Bosses', zh: '首領' } },
              admin: { description: { en: 'Raid bosses or boss encounters in this map', zh: '此地圖中的團隊首領或首領遭遇' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'level', type: 'text', admin: { width: '20%' } },
                    { name: 'hp', label: { en: 'HP', zh: 'HP' }, type: 'text', admin: { width: '20%', description: { en: 'e.g. 1,500,000', zh: '例如 1,500,000' } } },
                    { name: 'element', type: 'text', admin: { width: '20%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 8: Notes ────────────────────────────────────── */
        {
          label: { en: 'Notes', zh: '備註' },
          fields: [
            { name: 'notes', label: { en: 'Notes', zh: '備註' }, type: 'richText' },
          ],
        },
      ],
    },
  ],
};

export default Maps;
