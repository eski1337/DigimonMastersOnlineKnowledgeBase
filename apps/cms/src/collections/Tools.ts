import { CollectionConfig } from 'payload/types';
import { TOOL_TYPES } from '@dmo-kb/shared';

const Tools: CollectionConfig = {
  slug: 'tools',
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
    { name: 'slug', type: 'text', required: true, unique: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: TOOL_TYPES.map(type => ({ label: type, value: type })),
    },
    { name: 'description', type: 'textarea' },
    { name: 'config', type: 'json' },
    { name: 'published', type: 'checkbox', defaultValue: true },
  ],
};

export default Tools;
