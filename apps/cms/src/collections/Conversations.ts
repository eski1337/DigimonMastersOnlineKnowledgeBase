import { CollectionConfig } from 'payload/types';

/**
 * Conversations (DM Threads)
 *
 * A conversation is a thread between exactly 2 users.
 * Each conversation tracks participants and the last message timestamp
 * for efficient inbox sorting.
 *
 * Design decision: separate Conversations + Messages collections
 * (vs a single flat messages collection) because:
 * - Inbox queries only need conversations, not all messages
 * - Unread counts are per-conversation
 * - Soft delete is per-user per-conversation
 * - Scales better: inbox = scan conversations, not all messages
 */
const Conversations: CollectionConfig = {
  slug: 'conversations',
  labels: {
    singular: 'Conversation',
    plural: 'Conversations',
  },
  admin: {
    useAsTitle: 'id',
    group: 'Social',
    defaultColumns: ['participants', 'lastMessageAt', 'createdAt'],
  },
  timestamps: true,
  access: {
    // Only participants can read their own conversations
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return {
        'participants.user': { equals: user.id },
      };
    },
    // Authenticated users can create (start a conversation)
    create: ({ req: { user } }) => !!user,
    // Only participants can update (e.g., mark read, soft-delete)
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return {
        'participants.user': { equals: user.id },
      };
    },
    // Only admin/owner can hard-delete
    delete: ({ req: { user } }) => {
      if (!user) return false;
      return ['admin', 'owner'].includes(user.role);
    },
  },
  fields: [
    {
      name: 'participants',
      type: 'array',
      required: true,
      minRows: 2,
      maxRows: 2,
      admin: { description: 'The two users in this conversation' },
      fields: [
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'lastReadAt',
          type: 'date',
          admin: { description: 'When this participant last read the conversation' },
        },
        {
          name: 'deletedAt',
          type: 'date',
          admin: { description: 'Soft-delete: user removed conversation from their inbox' },
        },
      ],
    },
    {
      name: 'lastMessageAt',
      type: 'date',
      index: true,
      admin: { readOnly: true, description: 'Timestamp of the most recent message' },
    },
    {
      name: 'lastMessagePreview',
      type: 'text',
      maxLength: 100,
      admin: { readOnly: true, description: 'Preview of the last message for inbox display' },
    },
  ],
};

export default Conversations;
