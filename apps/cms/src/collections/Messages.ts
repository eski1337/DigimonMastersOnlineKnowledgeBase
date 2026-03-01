import { CollectionConfig } from 'payload/types';

/**
 * Messages (within Conversations)
 *
 * Individual messages sent between users within a conversation thread.
 * Access: only conversation participants can read/create messages.
 * Soft-delete per user so one user deleting doesn't affect the other.
 */
const Messages: CollectionConfig = {
  slug: 'messages',
  labels: {
    singular: 'Message',
    plural: 'Messages',
  },
  admin: {
    useAsTitle: 'id',
    group: 'Social',
    defaultColumns: ['sender', 'conversation', 'body', 'createdAt'],
  },
  timestamps: true,
  access: {
    // Participants only (enforced via conversation membership at API layer too)
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      // Payload can't do nested array lookups easily, so we filter at API layer
      // This is a fallback: sender can always see their own messages
      return { sender: { equals: user.id } };
    },
    create: ({ req: { user } }) => !!user,
    // Messages are immutable once sent (no edit)
    update: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
    // Only admin/owner can hard-delete
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        // Only auto-set sender if not already provided (web API sets it explicitly)
        if (req.user && operation === 'create' && !data.sender) {
          data.sender = req.user.id;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'conversation',
      type: 'relationship',
      relationTo: 'conversations',
      required: true,
      index: true,
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'body',
      type: 'textarea',
      required: true,
      maxLength: 5000,
    },
    {
      name: 'deletedFor',
      type: 'array',
      admin: { description: 'Users who have soft-deleted this message from their view' },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
        },
      ],
    },
  ],
};

export default Messages;
