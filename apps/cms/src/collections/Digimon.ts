import { CollectionConfig } from 'payload/types';
import { 
  DIGIMON_ELEMENTS, 
  DIGIMON_ATTRIBUTES, 
  DIGIMON_RANKS, 
  DIGIMON_FAMILIES,
  DIGIMON_FORMS,
  DIGIMON_ATTACKER_TYPES 
} from '@dmo-kb/shared';
import ImportButton from '../components/ImportButton';

const Digimon: CollectionConfig = {
  slug: 'digimon',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'form', 'rank', 'element', 'attribute', 'published'],
    group: 'Content',
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
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly identifier',
      },
    },
    {
      name: 'names',
      label: 'Localized Names',
      type: 'group',
      admin: {
        description: 'Digimon names in different languages',
      },
      fields: [
        {
          name: 'japanese',
          label: 'Japanese (日本語)',
          type: 'text',
          admin: {
            description: 'Japanese name',
          },
        },
        {
          name: 'katakana',
          label: 'Japanese Katakana (カタカナ)',
          type: 'text',
          admin: {
            description: 'Katakana representation',
          },
        },
        {
          name: 'korean',
          label: 'Korean (한국어)',
          type: 'text',
          admin: {
            description: 'Korean name',
          },
        },
        {
          name: 'chinese',
          label: 'Chinese (中文)',
          type: 'text',
          admin: {
            description: 'Hong Kong/Traditional Chinese name',
          },
        },
        {
          name: 'thai',
          label: 'Thai (ไทย)',
          type: 'text',
          admin: {
            description: 'Thai name',
          },
        },
      ],
    },
    {
      name: 'introduction',
      label: 'Introduction',
      type: 'textarea',
      admin: {
        description: 'Brief introduction or lore about this Digimon',
      },
    },
    {
      name: 'form',
      label: 'Form/Stage',
      type: 'select',
      required: true,
      options: DIGIMON_FORMS.map((form: string) => ({ label: form, value: form })),
      admin: {
        description: 'Evolution stage (e.g., Rookie, Champion, Ultimate)',
      },
    },
    {
      name: 'rank',
      label: 'Rank',
      type: 'select',
      required: false,
      options: DIGIMON_RANKS.map((rank: string) => ({ label: rank, value: rank })),
      admin: {
        description: 'Power tier (N, A, S, SS, SSS, U) - Leave empty if no rank',
      },
    },
    {
      name: 'type',
      label: 'Type',
      type: 'text',
      admin: {
        description: 'Digimon classification (e.g., Holy Knight, Dragon, Beast, Bird, etc.)',
      },
    },
    {
      name: 'attackerType',
      label: 'Attacker Type',
      type: 'select',
      options: DIGIMON_ATTACKER_TYPES.map((type: string) => ({ label: type, value: type })),
      admin: {
        description: 'Combat role (QA, SA, NA, DE)',
      },
    },
    {
      name: 'icon',
      label: 'Icon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Small icon image (e.g., Falcomon_Icon.png from DMO Wiki)',
      },
    },
    {
      name: 'mainImage',
      label: 'Main Image',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Main Digimon image/sprite',
      },
    },
    {
      name: 'images',
      type: 'array',
      label: 'Additional Images',
      admin: {
        description: 'Additional images or variants',
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'attribute',
      type: 'select',
      required: true,
      options: DIGIMON_ATTRIBUTES.map((attr: string) => ({ label: attr, value: attr })),
    },
    {
      name: 'element',
      type: 'select',
      required: true,
      options: DIGIMON_ELEMENTS.map((elem: string) => ({ label: elem, value: elem })),
    },
    {
      name: 'families',
      type: 'select',
      hasMany: true,
      options: DIGIMON_FAMILIES.map((fam: string) => ({ label: fam, value: fam })),
    },
    {
      name: 'variants',
      label: 'Variants/Alternative Forms',
      type: 'array',
      admin: {
        description: 'Different appearances or seasonal variants of this Digimon',
      },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'digivolutions',
      label: 'Digivolution Chains',
      type: 'group',
      fields: [
        {
          name: 'digivolvesFrom',
          label: 'Digivolves From',
          type: 'array',
          admin: {
            description: 'Previous evolution stages (e.g., Agumon digivolves from Koromon)',
          },
          fields: [
            {
              name: 'name',
              label: 'Digimon Name',
              type: 'text',
              required: true,
              admin: {
                description: 'Name of the Digimon (will be linked automatically when available)',
              },
            },
            {
              name: 'requirements',
              type: 'textarea',
              admin: {
                description: 'Level, stats, or item requirements',
              },
            },
          ],
        },
        {
          name: 'digivolvesTo',
          label: 'Digivolves To',
          type: 'array',
          admin: {
            description: 'Next evolution stages (e.g., Agumon digivolves to Greymon)',
          },
          fields: [
            {
              name: 'name',
              label: 'Digimon Name',
              type: 'text',
              required: true,
              admin: {
                description: 'Name of the Digimon (will be linked automatically when available)',
              },
            },
            {
              name: 'requiredLevel',
              label: 'Required Level',
              type: 'number',
              admin: {
                description: 'Level required to digivolve (e.g., 11, 25, 41)',
              },
            },
            {
              name: 'requiredItem',
              label: 'Required Item',
              type: 'text',
              admin: {
                description: 'Item needed for this evolution (e.g., "Atho, René, Por")',
              },
            },
          ],
        },
        {
          name: 'jogress',
          label: 'Jogress/DNA Digivolutions',
          type: 'array',
          admin: {
            description: 'DNA Digivolution partners',
          },
          fields: [
            {
              name: 'partner',
              type: 'relationship',
              relationTo: 'digimon',
              required: true,
            },
            {
              name: 'result',
              type: 'relationship',
              relationTo: 'digimon',
              required: true,
            },
            {
              name: 'requirements',
              type: 'textarea',
            },
          ],
        },
      ],
    },
    {
      name: 'skills',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { 
          name: 'icon', 
          label: 'Skill Icon',
          type: 'upload', 
          relationTo: 'media',
          admin: {
            description: 'Skill icon image from DMO Wiki',
          },
        },
        { name: 'description', type: 'textarea' },
        {
          name: 'type',
          type: 'select',
          options: [
            { label: 'Attack', value: 'Attack' },
            { label: 'Support', value: 'Support' },
            { label: 'Passive', value: 'Passive' },
          ],
        },
        { 
          name: 'element', 
          label: 'Skill Attribute',
          type: 'text',
          admin: {
            description: 'Elemental attribute of the skill',
          },
        },
        { 
          name: 'cooldown', 
          label: 'Cooldown (seconds)',
          type: 'number',
          admin: {
            description: 'Skill cooldown time in seconds',
          },
        },
        { 
          name: 'dsConsumption', 
          label: 'DS Consumption',
          type: 'number',
          admin: {
            description: 'Digi-Soul points consumed per use',
          },
        },
        { 
          name: 'skillPointsPerUpgrade', 
          label: 'Skill Points per Upgrade',
          type: 'number',
          admin: {
            description: 'Skill points required for each level upgrade',
          },
        },
        { 
          name: 'animationTime', 
          label: 'Animation Time (seconds)',
          type: 'number',
          admin: {
            description: 'Duration of skill animation in seconds',
          },
        },
        { 
          name: 'damagePerLevel', 
          label: 'Damage per Level (1-25)',
          type: 'textarea',
          admin: {
            description: 'Damage values for each skill level from 1 to 25',
          },
        },
      ],
    },
    {
      name: 'stats',
      label: 'Base Stats',
      type: 'group',
      admin: {
        description: 'Base statistics for this Digimon (starting values)',
      },
      fields: [
        { name: 'hp', label: 'Health Points (HP)', type: 'number' },
        { name: 'at', label: 'Attack (AT)', type: 'number' },
        { name: 'de', label: 'Defense (DE)', type: 'number' },
        { name: 'as', label: 'Attack Speed (AS)', type: 'number' },
        { name: 'ds', label: 'Digi-Soul (DS)', type: 'number' },
        { name: 'ct', label: 'Critical Hit (CT)', type: 'number' },
        { name: 'ht', label: 'Hit Rate (HT)', type: 'number' },
        { name: 'ev', label: 'Evasion (EV)', type: 'number' },
      ],
    },
    {
      name: 'maxStats',
      label: 'Max Stats (100% Size, Level 140)',
      type: 'group',
      admin: {
        description: 'Maximum statistics at 100% Digimon Size and Level 140',
      },
      fields: [
        { name: 'hp', label: 'Health Points (HP)', type: 'number' },
        { name: 'at', label: 'Attack (AT)', type: 'number' },
        { name: 'de', label: 'Defense (DE)', type: 'number' },
        { name: 'as', label: 'Attack Speed (AS)', type: 'number' },
        { name: 'ds', label: 'Digi-Soul (DS)', type: 'number' },
        { name: 'ct', label: 'Critical Hit (CT)', type: 'number' },
        { name: 'ht', label: 'Hit Rate (HT)', type: 'number' },
        { name: 'ev', label: 'Evasion (EV)', type: 'number' },
      ],
    },
    {
      name: 'sizePct',
      type: 'number',
      admin: {
        description: 'Size percentage (100 = normal)',
      },
    },
    {
      name: 'obtain',
      type: 'textarea',
      admin: {
        description: 'How to obtain this Digimon',
      },
    },
    {
      name: 'unlockedAtLevel',
      label: 'Unlocked at Level',
      type: 'number',
      admin: {
        description: 'Tamer level required to unlock this Digimon',
      },
    },
    {
      name: 'unlockedWithItem',
      label: 'Unlocked with Item',
      type: 'text',
      admin: {
        description: 'Item name required to unlock (e.g., Mercenary Egg)',
      },
    },
    {
      name: 'requiredToEvolve',
      label: 'Required to Evolve',
      type: 'textarea',
      admin: {
        description: 'Items, stats, or other requirements needed for evolution',
      },
    },
    {
      name: 'rideability',
      label: 'Ride System',
      type: 'group',
      admin: {
        description: 'Riding capability information',
      },
      fields: [
        {
          name: 'canBeRidden',
          label: 'Can Be Ridden',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Whether this Digimon can be ridden',
          },
        },
        {
          name: 'rideableWithItem',
          label: 'Rideable with Item',
          type: 'text',
          admin: {
            description: 'Item required to make rideable (e.g., Ride Mode item)',
          },
        },
        {
          name: 'rideSpeed',
          label: 'Ride Speed',
          type: 'number',
          admin: {
            description: 'Movement speed when riding (percentage)',
          },
        },
      ],
    },
    {
      name: 'availability',
      label: 'Availability',
      type: 'group',
      admin: {
        description: 'How this Digimon is available to players',
      },
      fields: [
        {
          name: 'canBeHatched',
          label: 'Can Be Hatched',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Can be obtained from eggs',
          },
        },
        {
          name: 'available',
          label: 'Currently Available',
          type: 'checkbox',
          defaultValue: true,
          admin: {
            description: 'Whether this Digimon is currently available in the game',
          },
        },
        {
          name: 'limitedTime',
          label: 'Limited Time',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            description: 'Is this a limited-time or event-exclusive Digimon',
          },
        },
      ],
    },
    {
      name: 'visualEvolutionLayout',
      type: 'json',
      admin: {
        description: 'Visual evolution tree layout for this individual Digimon (nodes and connections)',
      },
    },
    {
      name: 'evolutionLine',
      type: 'relationship',
      relationTo: 'evolution-lines',
      admin: {
        description: 'Shared evolution line that this Digimon belongs to',
      },
    },
    {
      name: 'notes',
      type: 'richText',
    },
    {
      name: 'sources',
      type: 'array',
      fields: [{ name: 'source', type: 'text' }],
    },
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
};

export default Digimon;
