import { CollectionConfig } from 'payload/types';

/**
 * Reports
 *
 * Users can report other users, comments, or messages for moderation.
 * Only admins/owners can view and resolve reports.
 * Reporters can see their own submitted reports.
 */
const Reports: CollectionConfig = {
  slug: 'reports',
  labels: {
    singular: 'Report',
    plural: 'Reports',
  },
  admin: {
    useAsTitle: 'reason',
    group: 'Social',
    defaultColumns: ['reporter', 'targetType', 'reason', 'status', 'createdAt'],
  },
  timestamps: true,
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { reporter: { equals: user.id } };
    },
    create: ({ req: { user } }) => !!user,
    // Only admin/owner can update (resolve/dismiss)
    update: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (req.user && operation === 'create') {
          data.reporter = req.user.id;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'targetType',
      label: 'Report Type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'User', value: 'user' },
        { label: 'Profile Comment', value: 'profile_comment' },
        { label: 'Message', value: 'message' },
      ],
    },
    {
      name: 'targetUser',
      label: 'Reported User',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { condition: (data) => data?.targetType === 'user' },
    },
    {
      name: 'targetComment',
      label: 'Reported Comment',
      type: 'relationship',
      relationTo: 'profile-comments',
      admin: { condition: (data) => data?.targetType === 'profile_comment' },
    },
    {
      name: 'targetMessage',
      label: 'Reported Message',
      type: 'relationship',
      relationTo: 'messages',
      admin: { condition: (data) => data?.targetType === 'message' },
    },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: [
        { label: 'Spam', value: 'spam' },
        { label: 'Harassment', value: 'harassment' },
        { label: 'Inappropriate Content', value: 'inappropriate' },
        { label: 'Impersonation', value: 'impersonation' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'details',
      type: 'textarea',
      maxLength: 1000,
      admin: { description: 'Additional details about the report' },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Reviewing', value: 'reviewing' },
        { label: 'Resolved', value: 'resolved' },
        { label: 'Dismissed', value: 'dismissed' },
      ],
      access: {
        update: ({ req: { user } }) => {
          if (!user) return false;
          return ['admin', 'owner'].includes(user.role);
        },
      },
    },
    {
      name: 'moderatorNote',
      type: 'textarea',
      maxLength: 500,
      access: {
        read: ({ req: { user } }) => {
          if (!user) return false;
          return ['admin', 'owner'].includes(user.role);
        },
        update: ({ req: { user } }) => {
          if (!user) return false;
          return ['admin', 'owner'].includes(user.role);
        },
      },
      admin: { description: 'Internal note for moderators' },
    },
    {
      name: 'resolvedBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true },
    },
    {
      name: 'resolvedAt',
      type: 'date',
      admin: { readOnly: true },
    },
  ],
};

export default Reports;
