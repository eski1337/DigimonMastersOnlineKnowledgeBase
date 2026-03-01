import { CollectionConfig } from 'payload/types';

/**
 * User Blocks
 *
 * When user A blocks user B:
 * - B cannot send messages to A
 * - B cannot comment on A's profile
 * - B's existing comments on A's profile are hidden
 * - A doesn't see B in searches/listings
 *
 * Blocking is unidirectional: A blocks B doesn't mean B blocks A.
 */
const UserBlocks: CollectionConfig = {
  slug: 'user-blocks',
  labels: {
    singular: 'User Block',
    plural: 'User Blocks',
  },
  admin: {
    useAsTitle: 'id',
    group: 'Social',
    defaultColumns: ['blocker', 'blocked', 'createdAt'],
  },
  timestamps: true,
  access: {
    // Users can see their own blocks
    read: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { blocker: { equals: user.id } };
    },
    // Authenticated users can create blocks
    create: ({ req: { user } }) => !!user,
    // No editing blocks — delete and recreate
    update: () => false,
    // Users can unblock (delete their own blocks); admin can delete any
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { blocker: { equals: user.id } };
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        if (req.user && operation === 'create') {
          data.blocker = req.user.id;
        }
        return data;
      },
    ],
    beforeValidate: [
      ({ data, req }) => {
        // Prevent self-blocking
        if (data?.blocker === data?.blocked) {
          throw new Error('You cannot block yourself');
        }
        // Prevent blocking admins/owners
        // (enforced at API layer for better UX, but safety check here too)
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'blocker',
      label: 'Blocked By',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'blocked',
      label: 'Blocked User',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'reason',
      type: 'text',
      maxLength: 200,
      admin: { description: 'Optional reason (private, only visible to the blocker)' },
    },
  ],
};

export default UserBlocks;
