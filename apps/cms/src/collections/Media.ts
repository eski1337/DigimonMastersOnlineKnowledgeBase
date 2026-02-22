import { CollectionConfig } from 'payload/types';

const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticURL: '/media',
    staticDir: 'media',
    imageSizes: [
      {
        name: 'thumbnail',
        width: 400,
        height: 400,
        position: 'centre',
      },
      {
        name: 'card',
        width: 768,
        height: 768,
        position: 'centre',
      },
      {
        name: 'feature',
        width: 1024,
        height: 576,
        position: 'centre',
      },
    ],
    adminThumbnail: 'thumbnail',
    mimeTypes: ['image/*'],
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'imageType',
      label: 'Image Type',
      type: 'select',
      options: [
        { label: 'Digimon Icon', value: 'digimon-icon' },
        { label: 'Digimon Main Artwork', value: 'digimon-main' },
        { label: 'Digimon Sprite', value: 'digimon-sprite' },
        { label: 'Skill Icon', value: 'skill-icon' },
        { label: 'Item Icon', value: 'item-icon' },
        { label: 'Attribute Icon', value: 'attribute-icon' },
        { label: 'Element Icon', value: 'element-icon' },
        { label: 'UI Element', value: 'ui-element' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'What type of image is this?',
      },
    },
    {
      name: 'sourceUrl',
      label: 'Source URL',
      type: 'text',
      admin: {
        description: 'Original URL from DMO Wiki or other source',
      },
    },
    {
      name: 'sourceFile',
      label: 'Source Filename',
      type: 'text',
      admin: {
        description: 'Original filename from source (e.g., Falcomon_Icon.png)',
      },
    },
    {
      name: 'belongsTo',
      label: 'Belongs To',
      type: 'group',
      admin: {
        description: 'What does this image belong to?',
      },
      fields: [
        {
          name: 'digimon',
          label: 'Digimon Name',
          type: 'text',
          admin: {
            description: 'If this is a Digimon image, which Digimon?',
          },
        },
        {
          name: 'skill',
          label: 'Skill Name',
          type: 'text',
          admin: {
            description: 'If this is a skill icon, which skill?',
          },
        },
        {
          name: 'item',
          label: 'Item Name',
          type: 'text',
          admin: {
            description: 'If this is an item icon, which item?',
          },
        },
      ],
    },
    {
      name: 'hash',
      label: 'File Hash',
      type: 'text',
      admin: {
        description: 'MD5 hash for duplicate detection',
        readOnly: true,
      },
    },
    {
      name: 'importedAt',
      label: 'Imported At',
      type: 'date',
      admin: {
        description: 'When was this image imported?',
        readOnly: true,
      },
    },
    {
      name: 'lastChecked',
      label: 'Last Checked',
      type: 'date',
      admin: {
        description: 'Last time we checked if source was updated',
      },
    },
    {
      name: 'isOutdated',
      label: 'Is Outdated',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'Mark as outdated if source has newer version',
      },
    },
    {
      name: 'tags',
      type: 'array',
      label: 'Tags',
      admin: {
        description: 'Additional tags for organization',
      },
      fields: [
        {
          name: 'tag',
          type: 'text',
        },
      ],
    },
    {
      name: 'source',
      type: 'text',
      admin: {
        description: 'Original source of the image',
      },
    },
    {
      name: 'credits',
      type: 'text',
      admin: {
        description: 'Credits for the image',
      },
    },
  ],
};

export default Media;
