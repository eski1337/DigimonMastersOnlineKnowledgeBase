import { CollectionConfig } from 'payload/types';

/**
 * Profile Comments (Wall System)
 *
 * Users can leave comments on other users' profile pages.
 * Supports 1-level threading via optional `parent` field.
 * Authors can edit/delete their own; admins can moderate all.
 */
const ProfileComments: CollectionConfig = {
  slug: 'profile-comments',
  labels: {
    singular: 'Profile Comment',
    plural: 'Profile Comments',
  },
  admin: {
    useAsTitle: 'id',
    group: 'Social',
    defaultColumns: ['author', 'profile', 'body', 'createdAt'],
  },
  timestamps: true,
  access: {
    // Anyone can read comments (profile visibility checked at API layer)
    read: () => true,
    // Authenticated users can create
    create: ({ req: { user } }) => !!user,
    // Author or admin/owner can update
    update: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { author: { equals: user.id } };
    },
    // Author or admin/owner can delete
    delete: ({ req: { user } }) => {
      if (!user) return false;
      if (['admin', 'owner'].includes(user.role)) return true;
      return { author: { equals: user.id } };
    },
  },
  hooks: {
    beforeChange: [
      ({ req, operation, data }) => {
        // Only auto-set author if not already provided (web API sets it explicitly)
        if (req.user && operation === 'create' && !data.author) {
          data.author = req.user.id;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      name: 'profile',
      label: 'Profile Owner',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      admin: { description: 'The user whose profile this comment is on' },
    },
    {
      name: 'author',
      label: 'Comment Author',
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
      maxLength: 2000,
    },
    {
      name: 'parent',
      label: 'Reply To',
      type: 'relationship',
      relationTo: 'profile-comments',
      index: true,
      admin: { description: 'If this is a reply, reference the parent comment' },
    },
    {
      name: 'isHidden',
      label: 'Hidden (Moderated)',
      type: 'checkbox',
      defaultValue: false,
      access: {
        update: ({ req: { user } }) => {
          if (!user) return false;
          return ['admin', 'owner'].includes(user.role);
        },
      },
      admin: { description: 'Hidden by moderator' },
    },
  ],
};

export default ProfileComments;
