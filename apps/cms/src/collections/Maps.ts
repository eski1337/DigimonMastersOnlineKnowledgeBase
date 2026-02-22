import { CollectionConfig } from 'payload/types';

const Maps: CollectionConfig = {
  slug: 'maps',
  admin: {
    useAsTitle: 'name',
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
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'region', type: 'text' },
    { name: 'levelRange', type: 'text' },
    { name: 'image', type: 'upload', relationTo: 'media' },
    {
      name: 'bosses',
      type: 'array',
      fields: [{ name: 'boss', type: 'text' }],
    },
    {
      name: 'npcs',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'type', type: 'text' },
        { name: 'location', type: 'text' },
      ],
    },
    {
      name: 'portals',
      type: 'array',
      fields: [
        { name: 'destination', type: 'text', required: true },
        { name: 'requirements', type: 'text' },
      ],
    },
    { name: 'notes', type: 'richText' },
    { name: 'published', type: 'checkbox', defaultValue: false },
  ],
};

export default Maps;
