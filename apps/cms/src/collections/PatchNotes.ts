import { CollectionConfig } from 'payload/types';

const PatchNotes: CollectionConfig = {
  slug: 'patchNotes',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'version', 'publishedDate', 'published'],
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
    { 
      name: 'slug', 
      type: 'text', 
      required: true,
      unique: true,
      admin: {
        description: 'Unique identifier for the patch note'
      }
    },
    { 
      name: 'version', 
      type: 'text',
      admin: {
        description: 'Version number (e.g., 1.2.3)'
      }
    },
    { 
      name: 'publishedDate', 
      type: 'date', 
      required: true,
      admin: {
        description: 'Original publish date of the patch note'
      }
    },
    { 
      name: 'content', 
      type: 'textarea', 
      required: true,
      maxLength: 500000,
      admin: {
        description: 'Plain text summary of the patch note'
      }
    },
    {
      name: 'images',
      type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media' }],
    },
    { 
      name: 'url', 
      type: 'text',
      admin: {
        description: 'Original URL source'
      }
    },
    {
      name: 'sourceId',
      type: 'number',
      unique: true,
      index: true,
      admin: {
        description: 'Numeric ID from the official site (idx parameter)',
      },
    },
    {
      name: 'sourceHash',
      type: 'text',
      admin: {
        description: 'SHA-256 hash of scraped content for change detection',
      },
    },
    {
      name: 'htmlContent',
      type: 'textarea',
      maxLength: 500000,
      admin: {
        description: 'Sanitized HTML content for safe rendering (from scraper)',
      },
    },
    { 
      name: 'published', 
      type: 'checkbox', 
      defaultValue: true,
      admin: {
        description: 'Show on website'
      }
    },
  ],
};

export default PatchNotes;
