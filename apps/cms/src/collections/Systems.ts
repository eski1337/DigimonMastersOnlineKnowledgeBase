import { CollectionConfig } from 'payload/types';

const Systems: CollectionConfig = {
  slug: 'systems',
  admin: {
    useAsTitle: 'title',
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
    {
      name: 'published',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      type: 'row',
      fields: [
        { name: 'title', type: 'text', required: true, admin: { width: '60%' } },
        { name: 'slug', type: 'text', required: true, unique: true, admin: { width: '40%' } },
      ],
    },
    { name: 'summary', type: 'textarea' },
    {
      name: 'tags',
      type: 'array',
      admin: { initCollapsed: true },
      fields: [{ name: 'tag', type: 'text' }],
    },
    { name: 'coverImage', type: 'upload', relationTo: 'media' },
    { name: 'author', type: 'relationship', relationTo: 'users' },

    /* ═══════════════════════════════════════════════════════════════
       LAYOUT — flexible block-based content
       ═══════════════════════════════════════════════════════════════ */
    {
      name: 'layout',
      type: 'blocks',
      blocks: [
        /* ── Rich Text block ───────────────────────────────────── */
        {
          slug: 'richText',
          labels: { singular: 'Rich Text', plural: 'Rich Text' },
          fields: [
            { name: 'content', type: 'richText', required: true },
          ],
        },

        /* ── Callout / Info box ────────────────────────────────── */
        {
          slug: 'callout',
          labels: { singular: 'Callout', plural: 'Callouts' },
          fields: [
            {
              name: 'type',
              type: 'select',
              defaultValue: 'info',
              options: [
                { label: 'Info', value: 'info' },
                { label: 'Warning', value: 'warning' },
                { label: 'Tip', value: 'tip' },
              ],
            },
            { name: 'content', type: 'richText', required: true },
          ],
        },

        /* ── Data Table ────────────────────────────────────────── */
        {
          slug: 'table',
          labels: { singular: 'Table', plural: 'Tables' },
          fields: [
            { name: 'title', type: 'text', admin: { description: 'Optional heading above the table' } },
            {
              name: 'headers',
              type: 'array',
              fields: [{ name: 'label', type: 'text', required: true }],
            },
            {
              name: 'rows',
              type: 'array',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  fields: [
                    { name: 'value', type: 'text' },
                    { name: 'icon', type: 'upload', relationTo: 'media', admin: { description: 'Optional inline icon for this cell' } },
                    { name: 'iconUrl', type: 'text', admin: { description: 'External icon URL (if not using media upload)' } },
                    {
                      name: 'lines',
                      type: 'array',
                      admin: { description: 'Structured sub-lines (e.g. material list with per-item icons)' },
                      fields: [
                        { name: 'text', type: 'text' },
                        { name: 'amount', type: 'text' },
                        { name: 'icon', type: 'upload', relationTo: 'media' },
                        { name: 'iconUrl', type: 'text', admin: { description: 'External icon URL (if not using media upload)' } },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Standalone Image / Screenshot ────────────────────── */
        {
          slug: 'image',
          labels: { singular: 'Image', plural: 'Images' },
          fields: [
            { name: 'image', type: 'upload', relationTo: 'media' },
            { name: 'imageUrl', type: 'text', admin: { description: 'External / static image URL (if not using media upload)' } },
            { name: 'caption', type: 'text' },
            {
              name: 'size',
              type: 'select',
              defaultValue: 'large',
              options: [
                { label: 'Small (inline)', value: 'small' },
                { label: 'Medium (50%)', value: 'medium' },
                { label: 'Large (full width)', value: 'large' },
              ],
            },
          ],
        },

        /* ── Image Grid ────────────────────────────────────────── */
        {
          slug: 'imageGrid',
          labels: { singular: 'Image Grid', plural: 'Image Grids' },
          fields: [
            { name: 'title', type: 'text' },
            {
              name: 'columns',
              type: 'select',
              defaultValue: '4',
              options: [
                { label: '2 Columns', value: '2' },
                { label: '3 Columns', value: '3' },
                { label: '4 Columns', value: '4' },
              ],
            },
            {
              name: 'images',
              type: 'array',
              fields: [
                { name: 'image', type: 'upload', relationTo: 'media' },
                { name: 'caption', type: 'text' },
                { name: 'imageUrl', type: 'text', admin: { description: 'External image URL (if not using media upload)' } },
              ],
            },
          ],
        },
      ],
    },

    // Keep legacy content field for backward compatibility
    { name: 'content', type: 'richText', admin: { description: 'Legacy content field — use Layout blocks above instead' } },
  ],
};

export default Systems;
