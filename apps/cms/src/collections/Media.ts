import { CollectionConfig } from 'payload/types';
import path from 'path';

const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticURL: '/media',
    staticDir: path.resolve(process.cwd(), 'media'),
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
  hooks: {
    beforeChange: [
      ({ data }) => {
        // Auto-populate alt text from filename if not provided
        if (!data.alt && data.filename) {
          data.alt = data.filename
            .replace(/\.[^.]+$/, '')
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: {
        description: 'Auto-generated from filename if left blank',
      },
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
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'What type of image is this?',
      },
    },
    // --- Advanced metadata (collapsed by default) ---
    {
      type: 'collapsible',
      label: 'Advanced Metadata',
      admin: {
        initCollapsed: true,
      },
      fields: [
        {
          name: 'belongsTo',
          label: 'Belongs To',
          type: 'group',
          fields: [
            { name: 'digimon', label: 'Digimon Name', type: 'text' },
            { name: 'skill', label: 'Skill Name', type: 'text' },
            { name: 'item', label: 'Item Name', type: 'text' },
          ],
        },
        { name: 'sourceUrl', label: 'Source URL', type: 'text' },
        { name: 'sourceFile', label: 'Source Filename', type: 'text' },
        { name: 'hash', label: 'File Hash', type: 'text', admin: { readOnly: true } },
        { name: 'importedAt', label: 'Imported At', type: 'date', admin: { readOnly: true } },
        { name: 'lastChecked', label: 'Last Checked', type: 'date' },
        { name: 'isOutdated', label: 'Is Outdated', type: 'checkbox', defaultValue: false },
        {
          name: 'tags', type: 'array', label: 'Tags',
          fields: [{ name: 'tag', type: 'text' }],
        },
        { name: 'source', type: 'text' },
        { name: 'credits', type: 'text' },
      ],
    },
  ],
};

export default Media;
