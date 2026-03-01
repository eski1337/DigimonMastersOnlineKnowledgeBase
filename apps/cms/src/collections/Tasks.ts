import { CollectionConfig } from 'payload/types';

const Tasks: CollectionConfig = {
  slug: 'tasks',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'priority', 'assignee', 'dueDate'],
    group: 'Internal',
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => !!user,
    create: ({ req: { user } }) => !!user,
    update: ({ req: { user } }) => !!user,
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (req.user) {
          if (operation === 'create') {
            data.createdBy = req.user.id;
          }
          data.updatedBy = req.user.id;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: {
        description: 'Short task title',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Detailed description of the task',
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'backlog',
      options: [
        { label: 'Backlog', value: 'backlog' },
        { label: 'Todo', value: 'todo' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Review', value: 'review' },
        { label: 'Done', value: 'done' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'priority',
      type: 'select',
      required: true,
      defaultValue: 'medium',
      options: [
        { label: 'Critical', value: 'critical' },
        { label: 'High', value: 'high' },
        { label: 'Medium', value: 'medium' },
        { label: 'Low', value: 'low' },
      ],
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'assignee',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        position: 'sidebar',
        description: 'Assigned team member',
      },
    },
    {
      name: 'dueDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayOnly',
          displayFormat: 'yyyy-MM-dd',
        },
      },
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
      admin: {
        description: 'Categorization tags',
      },
    },
    {
      name: 'sortOrder',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Position within the column (lower = higher)',
      },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'updatedBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
};

export default Tasks;
