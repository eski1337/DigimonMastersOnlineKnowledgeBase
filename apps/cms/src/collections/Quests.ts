import { CollectionConfig } from 'payload/types';
import { QUEST_TYPES } from '@dmo-kb/shared';

const Quests: CollectionConfig = {
  slug: 'quests',
  admin: {
    useAsTitle: 'title',
    group: 'Content',
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
      options: QUEST_TYPES.map(type => ({ label: type, value: type })),
    },
    { name: 'mapRef', type: 'relationship', relationTo: 'maps' },
    { name: 'level', type: 'number' },
    {
      name: 'steps',
      type: 'array',
      fields: [
        { name: 'order', type: 'number', required: true },
        { name: 'description', type: 'textarea', required: true },
      ],
    },
    {
      name: 'rewards',
      type: 'array',
      fields: [
        { name: 'type', type: 'text', required: true },
        { name: 'item', type: 'text', required: true },
        { name: 'quantity', type: 'number' },
      ],
    },
    { name: 'repeatable', type: 'checkbox', defaultValue: false },
    {
      name: 'prereqs',
      type: 'array',
      fields: [{ name: 'prereq', type: 'text' }],
    },
    { name: 'notes', type: 'richText' },
    { name: 'published', type: 'checkbox', defaultValue: false },
  ],
};

export default Quests;
