import { CollectionConfig } from 'payload/types';
import { isStaff } from '../access';

const TaskComments: CollectionConfig = {
  slug: 'task-comments',
  admin: {
    useAsTitle: 'id',
    group: 'Internal',
  },
  timestamps: true,
  access: {
    read: isStaff,
    create: isStaff,
    update: ({ req: { user } }) => {
      if (!user) return false;
      // Admins/owners can edit any comment, others only their own
      if (['admin', 'owner'].includes(user.role)) return true;
      return {
        author: {
          equals: user.id,
        },
      };
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return {
        author: {
          equals: user.id,
        },
      };
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (req.user && operation === 'create') {
          data.author = req.user.id;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'task',
      type: 'relationship',
      relationTo: 'tasks',
      required: true,
      index: true,
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        readOnly: true,
      },
    },
  ],
};

export default TaskComments;
