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
    group: { en: 'Game Data', zhTw: '遊戲資料' },
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
      label: { en: 'Published', zhTw: '已發布' },
      admin: {
        position: 'sidebar',
        description: { en: 'Toggle to make this Digimon visible on the website', zhTw: '切換以在網站上顯示此數碼獸' },
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
      label: { en: 'Slug', zhTw: '網址代碼' },
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
        /* ── Tab 1: Core Info ──────────────────────────────────── */
        {
          label: { en: 'Core', zhTw: '核心' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'form',
                  label: { en: 'Form / Stage', zhTw: '形態 / 階段' },
                  type: 'select',
                  required: true,
                  options: DIGIMON_FORMS.map((f: string) => ({ label: f, value: f })),
                  admin: { width: '25%', description: { en: 'Rookie, Champion, Ultimate …', zhTw: '成長期、成熟期、完全體…' } },
                },
                {
                  name: 'rank',
                  type: 'select',
                  options: DIGIMON_RANKS.map((r: string) => ({ label: r, value: r })),
                  admin: { width: '25%', description: { en: 'N / A / S / SS / SSS / U', zhTw: 'N / A / S / SS / SSS / U' } },
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
                  label: { en: 'Type', zhTw: '類型' },
                  type: 'text',
                  admin: { width: '33%', description: { en: 'Holy Knight, Dragon, Beast …', zhTw: '聖騎士、龍、獸…' } },
                },
                {
                  name: 'attackerType',
                  label: { en: 'Attacker Type', zhTw: '攻擊類型' },
                  type: 'select',
                  options: DIGIMON_ATTACKER_TYPES.map((t: string) => ({ label: t, value: t })),
                  admin: { width: '33%', description: { en: 'QA / SA / NA / DE', zhTw: '速攻 / 短攻 / 近攻 / 防禦' } },
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
              label: { en: 'Introduction', zhTw: '介紹' },
              type: 'textarea',
              admin: { description: { en: 'Brief introduction or lore about this Digimon', zhTw: '此數碼獸的簡介或背景故事' } },
            },
          ],
        },

        /* ── Tab 2: Media ──────────────────────────────────────── */
        {
          label: { en: 'Media', zhTw: '媒體' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'icon',
                  label: { en: 'Icon', zhTw: '圖示' },
                  type: 'upload',
                  relationTo: 'media',
                  admin: { width: '50%', description: { en: 'Small icon (e.g. Falcomon_Icon.png)', zhTw: '小圖示（例如 Falcomon_Icon.png）' } },
                },
                {
                  name: 'mainImage',
                  label: { en: 'Main Image', zhTw: '主要圖片' },
                  type: 'upload',
                  relationTo: 'media',
                  admin: { width: '50%', description: { en: 'Main sprite / artwork', zhTw: '主要精靈圖 / 圖稿' } },
                },
              ],
            },
            {
              name: 'images',
              type: 'array',
              label: { en: 'Additional Images', zhTw: '其他圖片' },
              admin: { description: { en: 'Extra images or variant artwork', zhTw: '額外圖片或變體圖稿' } },
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },

        /* ── Tab 3: Localization ───────────────────────────────── */
        {
          label: { en: 'Names', zhTw: '名稱' },
          fields: [
            {
              name: 'names',
              label: { en: 'Localized Names', zhTw: '各語言名稱' },
              type: 'group',
              admin: { description: { en: 'Translations of this Digimon\'s name', zhTw: '此數碼獸名稱的各語言翻譯' } },
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
          label: { en: 'Stats', zhTw: '能力值' },
          fields: [
            {
              name: 'stats',
              label: { en: 'Base Stats', zhTw: '基礎能力值' },
              type: 'group',
              admin: { description: { en: 'Starting values', zhTw: '初始數值' } },
              fields: statFields(),
            },
            {
              name: 'maxStats',
              label: { en: 'Max Stats (100% Size, Lv 140)', zhTw: '最大能力值（100%體型，Lv 140）' },
              type: 'group',
              admin: { description: { en: 'Maximum values at 100% size and level 140', zhTw: '100%體型及140等級的最大數值' } },
              fields: statFields(),
            },
            {
              name: 'sizePct',
              label: { en: 'Size %', zhTw: '體型 %' },
              type: 'number',
              admin: { width: '25%', description: { en: '100 = normal size', zhTw: '100 = 正常體型' } },
            },
          ],
        },

        /* ── Tab 5: Skills ─────────────────────────────────────── */
        {
          label: { en: 'Skills', zhTw: '技能' },
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
                  label: { en: 'Skill Icon', zhTw: '技能圖示' },
                  type: 'upload',
                  relationTo: 'media',
                  admin: { description: { en: 'Skill icon from DMO Wiki', zhTw: 'DMO Wiki 的技能圖示' } },
                },
                { name: 'description', type: 'textarea' },
                {
                  type: 'row',
                  fields: [
                    { name: 'cooldown', label: { en: 'Cooldown (s)', zhTw: '冷卻時間 (秒)' }, type: 'number', admin: { width: '25%' } },
                    { name: 'dsConsumption', label: { en: 'DS Cost', zhTw: 'DS 消耗' }, type: 'number', admin: { width: '25%' } },
                    { name: 'skillPointsPerUpgrade', label: { en: 'SP / Upgrade', zhTw: 'SP / 升級' }, type: 'number', admin: { width: '25%' } },
                    { name: 'animationTime', label: { en: 'Anim Time (s)', zhTw: '動畫時間 (秒)' }, type: 'number', admin: { width: '25%' } },
                  ],
                },
                {
                  name: 'damagePerLevel',
                  label: { en: 'Damage per Level (1-25)', zhTw: '每等級傷害 (1-25)' },
                  type: 'textarea',
                  admin: { description: { en: 'Damage values for each skill level', zhTw: '各技能等級的傷害數值' } },
                },
              ],
            },
          ],
        },

        /* ── Tab 6: Evolution ──────────────────────────────────── */
        {
          label: { en: 'Evolution', zhTw: '進化' },
          fields: [
            {
              name: 'digivolutions',
              label: { en: 'Digivolution Chains', zhTw: '進化鏈' },
              type: 'group',
              fields: [
                {
                  name: 'digivolvesFrom',
                  label: { en: 'Digivolves From', zhTw: '退化自' },
                  type: 'array',
                  admin: { description: { en: 'Previous evolution stages', zhTw: '上一個進化階段' } },
                  fields: [
                    { name: 'name', label: { en: 'Digimon Name', zhTw: '數碼獸名稱' }, type: 'text', required: true },
                    { name: 'requirements', type: 'textarea', admin: { description: { en: 'Level / stats / items', zhTw: '等級 / 能力值 / 道具' } } },
                  ],
                },
                {
                  name: 'digivolvesTo',
                  label: { en: 'Digivolves To', zhTw: '進化為' },
                  type: 'array',
                  admin: { description: { en: 'Next evolution stages', zhTw: '下一個進化階段' } },
                  fields: [
                    { name: 'name', label: 'Digimon Name', type: 'text', required: true },
                    {
                      type: 'row',
                      fields: [
                        { name: 'requiredLevel', label: { en: 'Required Level', zhTw: '需求等級' }, type: 'number', admin: { width: '50%' } },
                        { name: 'requiredItem', label: { en: 'Required Item', zhTw: '需求道具' }, type: 'text', admin: { width: '50%' } },
                      ],
                    },
                  ],
                },
                {
                  name: 'jogress',
                  label: { en: 'Jogress / DNA Digivolution', zhTw: '合體進化' },
                  type: 'array',
                  admin: { description: { en: 'DNA Digivolution partners', zhTw: '合體進化夥伴' } },
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
              label: { en: 'Evolution Requirements', zhTw: '進化需求' },
              type: 'textarea',
              admin: { description: { en: 'Items / stats needed for evolution', zhTw: '進化所需的道具 / 能力值' } },
            },
            {
              name: 'variants',
              label: { en: 'Variants / Alternative Forms', zhTw: '變體 / 替代形態' },
              type: 'array',
              admin: { description: { en: 'Seasonal variants or alternate appearances', zhTw: '季節限定變體或替代外觀' } },
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
              label: { en: 'Evolution Line', zhTw: '進化路線' },
              admin: { description: { en: 'Shared evolution line this Digimon belongs to', zhTw: '此數碼獸所屬的共用進化路線' } },
            },
            {
              name: 'visualEvolutionLayout',
              type: 'json',
              label: { en: 'Visual Evolution Layout', zhTw: '視覺進化佈局' },
              admin: { description: { en: 'Visual evolution tree layout (JSON)', zhTw: '視覺進化樹佈局（JSON）' } },
            },
          ],
        },

        /* ── Tab 7: Availability ───────────────────────────────── */
        {
          label: { en: 'Availability', zhTw: '取得方式' },
          fields: [
            {
              name: 'obtain',
              type: 'textarea',
              label: { en: 'How to Obtain', zhTw: '取得方式' },
              admin: { description: { en: 'How to obtain this Digimon', zhTw: '如何取得此數碼獸' } },
            },
            {
              type: 'row',
              fields: [
                { name: 'unlockedAtLevel', label: { en: 'Unlock Level', zhTw: '解鎖等級' }, type: 'number', admin: { width: '50%', description: { en: 'Tamer level required', zhTw: '馴獸師需求等級' } } },
                { name: 'unlockedWithItem', label: { en: 'Unlock Item', zhTw: '解鎖道具' }, type: 'text', admin: { width: '50%', description: { en: 'e.g. Mercenary Egg', zhTw: '例如：傭兵蛋' } } },
              ],
            },
            {
              name: 'availability',
              label: { en: 'Availability Flags', zhTw: '可用性標記' },
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'canBeHatched', label: { en: 'Can Be Hatched', zhTw: '可孵化' }, type: 'checkbox', defaultValue: false, admin: { width: '33%' } },
                    { name: 'available', label: { en: 'Currently Available', zhTw: '目前可用' }, type: 'checkbox', defaultValue: true, admin: { width: '33%' } },
                    { name: 'limitedTime', label: { en: 'Limited Time', zhTw: '限時' }, type: 'checkbox', defaultValue: false, admin: { width: '34%' } },
                  ],
                },
              ],
            },
            {
              name: 'rideability',
              label: { en: 'Ride System', zhTw: '騎乘系統' },
              type: 'group',
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'canBeRidden', label: { en: 'Can Be Ridden', zhTw: '可騎乘' }, type: 'checkbox', defaultValue: false, admin: { width: '33%' } },
                    { name: 'rideableWithItem', label: { en: 'Ride Item', zhTw: '騎乘道具' }, type: 'text', admin: { width: '33%' } },
                    { name: 'rideSpeed', label: { en: 'Ride Speed %', zhTw: '騎乘速度 %' }, type: 'number', admin: { width: '34%' } },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Tab 8: Notes & Sources ────────────────────────────── */
        {
          label: { en: 'Notes', zhTw: '備註' },
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
