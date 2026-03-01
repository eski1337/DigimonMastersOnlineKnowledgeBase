import { CollectionConfig } from 'payload/types';

export const Items: CollectionConfig = {
  slug: 'items',
  labels: {
    singular: 'Item',
    plural: 'Items',
  },
  admin: {
    useAsTitle: 'name',
    group: 'Game Data',
    defaultColumns: ['name', 'category', 'icon'],
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
      unique: true,
      admin: {
        description: 'Item name (e.g., "Jesmon X-Antibody Factor", "Atho")',
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'URL-friendly slug (auto-generated)',
      },
      hooks: {
        beforeValidate: [
          ({ data }: any) => {
            if (data?.name && !data?.slug) {
              return data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            }
            return data?.slug;
          },
        ],
      },
    },
    {
      name: 'category',
      type: 'select',
      options: [
        { label: 'Evolution Item', value: 'evolution' },
        { label: 'Unlock Item', value: 'unlock' },
        { label: 'Consumable', value: 'consumable' },
        { label: 'Equipment', value: 'equipment' },
        { label: 'Quest Item', value: 'quest' },
        { label: 'Other', value: 'other' },
      ],
      admin: {
        description: 'Type of item',
      },
    },
    {
      name: 'icon',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Item icon image',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Item description or usage',
      },
    },
    {
      name: 'sourceUrl',
      type: 'text',
      admin: {
        description: 'Original DMO Wiki URL for this item',
      },
    },
  ],
};

export default Items;
