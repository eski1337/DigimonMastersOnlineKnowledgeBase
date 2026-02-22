import { CollectionConfig } from 'payload/types';

const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
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
    { name: 'title', type: 'text', required: true },
    {
      name: 'dateRange',
      type: 'group',
      fields: [
        { name: 'start', type: 'date', required: true },
        { name: 'end', type: 'date' },
      ],
    },
    { name: 'summary', type: 'textarea' },
    {
      name: 'rewards',
      type: 'array',
      fields: [{ name: 'reward', type: 'text' }],
    },
    { name: 'sourceUrl', type: 'text', required: true },
    { name: 'locale', type: 'text', defaultValue: 'en' },
  ],
};

export default Events;
