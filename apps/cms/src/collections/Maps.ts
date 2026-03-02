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
    group: { en: 'Content', zhTw: '內容' },
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
      label: { en: 'Published', zhTw: '已發佈' },
      admin: {
        position: 'sidebar',
        description: { en: 'Toggle to make this Map visible on the website', zhTw: '切換以在網站上顯示此地圖' },
      },
    },

    /* ═══════════════════════════════════════════════════════════════
       IDENTITY — name + slug always visible above tabs
       ═══════════════════════════════════════════════════════════════ */
    {
      name: 'name',
      label: { en: 'Name', zhTw: '名稱' },
      type: 'text',
      required: true,
      admin: { width: '50%' },
    },
    {
      name: 'slug',
      label: { en: 'Slug', zhTw: '網址代稱' },
      type: 'text',
      required: true,
      unique: true,
      admin: {
        width: '50%',
        description: { en: 'URL-friendly identifier', zhTw: '網址友善識別碼' },
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
          label: { en: 'General', zhTw: '一般' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'world', label: { en: 'World', zhTw: '世界' }, type: 'select', options: [
                  { label: { en: 'Real World', zhTw: '現實世界' }, value: 'real-world' },
                  { label: { en: 'Digital World', zhTw: '數碼世界' }, value: 'digital-world' },
                ], required: true, admin: { width: '25%' } },
                { name: 'area', label: { en: 'Area', zhTw: '區域' }, type: 'select', options: [
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
                { name: 'mapType', label: { en: 'Map Type', zhTw: '地圖類型' }, type: 'select', options: [
                  { label: { en: 'Town / Hub', zhTw: '城鎮 / 樞紐' }, value: 'town' },
                  { label: { en: 'Field / Zone', zhTw: '野外 / 區域' }, value: 'field' },
                  { label: { en: 'Dungeon', zhTw: '副本' }, value: 'dungeon' },
                  { label: { en: 'Raid', zhTw: '團隊副本' }, value: 'raid' },
                  { label: { en: 'Event', zhTw: '活動' }, value: 'event' },
                  { label: { en: 'Instance', zhTw: '實例' }, value: 'instance' },
                ], admin: { width: '25%' } },
                { name: 'levelRange', label: { en: 'Level Range', zhTw: '等級範圍' }, type: 'text', admin: { width: '25%', description: { en: 'e.g. 1-10, 45-55', zhTw: '例如 1-10、45-55' } } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'region', label: { en: 'Region', zhTw: '地區' }, type: 'text', admin: { width: '50%', description: { en: 'Legacy field — use area select above instead', zhTw: '舊欄位 — 請改用上方的區域選擇' } } },
                { name: 'sortOrder', label: { en: 'Sort Order', zhTw: '排序順序' }, type: 'number', defaultValue: 0, admin: { width: '50%', description: { en: 'Order within its area group (lower = first)', zhTw: '在區域群組中的排序（數字越小越前面）' } } },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'hexCol', label: { en: 'Hex Col', zhTw: '六角欄' }, type: 'number', admin: { width: '50%', description: { en: 'Honeycomb grid column (0-based). Leave blank for auto-layout.', zhTw: '蜂巢網格欄位（從 0 開始）。留空則自動排列。' } } },
                { name: 'hexRow', label: { en: 'Hex Row', zhTw: '六角列' }, type: 'number', admin: { width: '50%', description: { en: 'Honeycomb grid row (0-based). Leave blank for auto-layout.', zhTw: '蜂巢網格列位（從 0 開始）。留空則自動排列。' } } },
              ],
            },
            {
              name: 'description',
              label: { en: 'Description', zhTw: '描述' },
              type: 'textarea',
              admin: { description: { en: 'Brief description or lore about this map', zhTw: '關於此地圖的簡要描述或背景故事' } },
            },
          ],
        },

        /* ── Tab 2: Media ────────────────────────────────────── */
        {
          label: { en: 'Media', zhTw: '媒體' },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'image', label: { en: 'Main Image', zhTw: '主要圖片' }, type: 'upload', relationTo: 'media', admin: { width: '50%', description: { en: 'Primary map image (e.g. loading screen)', zhTw: '地圖主要圖片（例如載入畫面）' } } },
                { name: 'mapImage', label: { en: 'Map Overlay', zhTw: '地圖覆蓋' }, type: 'upload', relationTo: 'media', admin: { width: '50%', description: { en: 'Top-down map/minimap image', zhTw: '俯視地圖 / 小地圖圖片' } } },
              ],
            },
            {
              name: 'gallery',
              label: { en: 'Gallery / Screenshots', zhTw: '圖庫 / 截圖' },
              type: 'array',
              admin: { description: { en: 'Extra screenshots or artwork', zhTw: '額外的截圖或美術圖' } },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media', required: true },
                { name: 'caption', label: { en: 'Caption', zhTw: '說明文字' }, type: 'text' },
              ],
            },
          ],
        },

        /* ── Tab 3: NPCs ─────────────────────────────────────── */
        {
          label: { en: 'NPCs', zhTw: 'NPC' },
          fields: [
            {
              name: 'npcs',
              type: 'array',
              labels: { singular: 'NPC', plural: 'NPC' },
              admin: { description: { en: 'Non-player characters found in this map', zhTw: '此地圖中的非玩家角色' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'role', label: { en: 'Role', zhTw: '角色' }, type: 'text', admin: { width: '40%', description: { en: 'e.g. DATS Leader, Digicore Merchant', zhTw: '例如 DATS 隊長、數碼核心商人' } } },
                    { name: 'icon', type: 'upload', relationTo: 'media', admin: { width: '20%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 4: Wild Digimon ─────────────────────────────── */
        {
          label: { en: 'Wild Digimon', zhTw: '野生數碼獸' },
          fields: [
            {
              name: 'wildDigimon',
              type: 'array',
              labels: { singular: { en: 'Wild Digimon', zhTw: '野生數碼獸' }, plural: { en: 'Wild Digimon', zhTw: '野生數碼獸' } },
              admin: { description: { en: 'Wild Digimon that spawn in this map', zhTw: '此地圖中出現的野生數碼獸' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '20%' } },
                    { name: 'variant', label: { en: 'Variant', zhTw: '變體' }, type: 'text', admin: { width: '15%', description: { en: 'e.g. Leader, Raid, Dismantler', zhTw: '例如 首領、團隊、拆解者' } } },
                    { name: 'behavior', label: { en: 'Behavior', zhTw: '行為' }, type: 'select', options: [
                      { label: { en: 'Defensive (Normal)', zhTw: '防禦型（普通）' }, value: 'defensive' },
                      { label: { en: 'Aggressive (Hostile)', zhTw: '攻擊型（敵對）' }, value: 'aggressive' },
                    ], defaultValue: 'defensive', admin: { width: '12%' } },
                    { name: 'hp', label: { en: 'HP', zhTw: 'HP' }, type: 'number', admin: { width: '10%', description: { en: 'Health Points', zhTw: '生命值' } } },
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
          label: { en: 'Drops', zhTw: '掉落物' },
          fields: [
            {
              name: 'drops',
              type: 'array',
              labels: { singular: { en: 'Drop', zhTw: '掉落物' }, plural: { en: 'Drops', zhTw: '掉落物' } },
              admin: { description: { en: 'Items dropped by monsters in this map', zhTw: '此地圖中怪物掉落的道具' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'monster', label: { en: 'Monster', zhTw: '怪物' }, type: 'text', required: true, admin: { width: '30%', description: { en: 'Monster that drops this item', zhTw: '掉落此道具的怪物' } } },
                    { name: 'item', label: { en: 'Item', zhTw: '道具' }, type: 'text', required: true, admin: { width: '30%' } },
                    { name: 'quantity', label: { en: 'Quantity', zhTw: '數量' }, type: 'text', admin: { width: '15%', description: { en: 'e.g. 1-3x', zhTw: '例如 1-3x' } } },
                    { name: 'icon', type: 'upload', relationTo: 'media', admin: { width: '25%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 6: Connections ──────────────────────────────── */
        {
          label: { en: 'Connections', zhTw: '連接' },
          fields: [
            {
              name: 'portals',
              label: { en: 'Connected Maps / Portals', zhTw: '連接地圖 / 傳送門' },
              type: 'array',
              admin: { description: { en: 'Maps connected to this one via portals or transitions', zhTw: '透過傳送門或通道連接到此地圖的其他地圖' } },
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
                        description: { en: 'Type to search maps — selecting auto-fills the slug', zhTw: '輸入以搜尋地圖 — 選擇後自動填入代稱' },
                        components: {
                          Field: MapSearchField,
                        },
                      },
                    },
                    { name: 'destinationSlug', label: { en: 'Destination Slug', zhTw: '目的地代稱' }, type: 'text', admin: { width: '35%', description: { en: 'Slug for linking. Leave empty if no page exists.', zhTw: '用於連結的代稱。若無頁面則留空。' } } },
                    { name: 'requirements', label: { en: 'Requirements', zhTw: '需求條件' }, type: 'text', admin: { width: '25%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 7: Bosses ───────────────────────────────────── */
        {
          label: { en: 'Bosses', zhTw: '首領' },
          fields: [
            {
              name: 'bosses',
              label: { en: 'Bosses', zhTw: '首領' },
              type: 'array',
              labels: { singular: { en: 'Boss', zhTw: '首領' }, plural: { en: 'Bosses', zhTw: '首領' } },
              admin: { description: { en: 'Raid bosses or boss encounters in this map', zhTw: '此地圖中的團隊首領或首領遭遇' } },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'name', type: 'text', required: true, admin: { width: '40%' } },
                    { name: 'level', type: 'text', admin: { width: '20%' } },
                    { name: 'hp', label: { en: 'HP', zhTw: 'HP' }, type: 'text', admin: { width: '20%', description: { en: 'e.g. 1,500,000', zhTw: '例如 1,500,000' } } },
                    { name: 'element', type: 'text', admin: { width: '20%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 8: Notes ────────────────────────────────────── */
        {
          label: { en: 'Notes', zhTw: '備註' },
          fields: [
            { name: 'notes', label: { en: 'Notes', zhTw: '備註' }, type: 'richText' },
          ],
        },
      ],
    },
  ],
};

export default Maps;
