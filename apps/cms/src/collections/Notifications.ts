import { CollectionConfig } from 'payload/types';

/**
 * Notifications
 *
 * Polymorphic notification system supporting:
 * - New message received
 * - New profile comment
 * - Mention in a comment
 * - Admin actions (role change, moderation)
 *
 * Each notification belongs to a single recipient.
 * Read/unread state tracked per notification.
 * TTL cleanup recommended for old read notifications.
 */
const Notifications: CollectionConfig = {
  slug: 'notifications',
  labels: {
    singular: 'Notification',
    plural: 'Notifications',
  },
  admin: {
    useAsTitle: 'type',
    group: 'Social',
    defaultColumns: ['recipient', 'type', 'title', 'isRead', 'createdAt'],
  },
  timestamps: true,
  access: {
    // Users can only read their own notifications
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { recipient: { equals: user.id } };
    },
    // Admin/service account can create; regular users cannot
    create: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
    // Users can mark their own as read
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { recipient: { equals: user.id } };
    },
    // Users can dismiss their own; admin can delete any
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { recipient: { equals: user.id } };
    },
  },
  fields: [
    {
      name: 'recipient',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'New Message', value: 'new_message' },
        { label: 'Profile Comment', value: 'profile_comment' },
        { label: 'Comment Reply', value: 'comment_reply' },
        { label: 'Mention', value: 'mention' },
        { label: 'Role Changed', value: 'role_change' },
        { label: 'Moderation', value: 'moderation' },
        { label: 'System', value: 'system' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 200,
      admin: { readOnly: true },
    },
    {
      name: 'body',
      type: 'text',
      maxLength: 500,
      admin: { readOnly: true },
    },
    {
      name: 'linkUrl',
      type: 'text',
      admin: { readOnly: true, description: 'URL to navigate to when clicking the notification' },
    },
    {
      name: 'fromUser',
      type: 'relationship',
      relationTo: 'users',
      admin: { readOnly: true, description: 'The user who triggered this notification' },
    },
    {
      name: 'isRead',
      type: 'checkbox',
      defaultValue: false,
      index: true,
    },
    {
      name: 'readAt',
      type: 'date',
    },
  ],
};

export default Notifications;
