import { CollectionConfig } from 'payload/types';

/**
 * Audit Logs Collection
 *
 * Immutable, owner-only log of all CMS operations.
 * - Cannot be updated or deleted via API
 * - Created only by internal hooks (overrideAccess)
 * - Indexed for fast querying at scale
 */
const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: {
    singular: 'Audit Log',
    plural: 'Audit Logs',
  },
  admin: {
    useAsTitle: 'documentTitle',
    group: 'System',
    defaultColumns: ['action', 'collection', 'documentTitle', 'userEmail', 'timestamp'],
    description: 'Immutable log of all CMS operations',
  },
  // Disable timestamps — we use our own `timestamp` field
  timestamps: false,
  access: {
    // Only owner can read audit logs
    read: ({ req: { user } }) => {
      if (!user) return false;
      return user.role === 'owner';
    },
    // Nobody can create via API — only internal hooks with overrideAccess
    create: () => false,
    // Immutable — nobody can update
    update: () => false,
    // Immutable — nobody can delete
    delete: () => false,
  },
  // No hooks on this collection — prevents recursive audit logging
  fields: [
    // ── Who ──
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'userEmail',
      type: 'text',
      index: true,
      admin: { readOnly: true, description: 'Denormalized for fast display' },
    },
    {
      name: 'userName',
      type: 'text',
      admin: { readOnly: true },
    },

    // ── What ──
    {
      name: 'action',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
        { label: 'Login', value: 'login' },
        { label: 'Logout', value: 'logout' },
        { label: 'Publish', value: 'publish' },
        { label: 'Unpublish', value: 'unpublish' },
        { label: 'Status Change', value: 'status_change' },
        { label: 'Role Change', value: 'role_change' },
        { label: 'Bulk Operation', value: 'bulk_operation' },
      ],
      admin: { readOnly: true },
    },

    // ── Where ──
    {
      name: 'targetCollection',
      type: 'text',
      required: true,
      index: true,
      admin: { readOnly: true, description: 'Target collection slug' },
    },
    {
      name: 'documentId',
      type: 'text',
      index: true,
      admin: { readOnly: true },
    },
    {
      name: 'documentTitle',
      type: 'text',
      admin: { readOnly: true, description: 'Human-readable title at time of action' },
    },

    // ── Diff ──
    {
      name: 'diff',
      type: 'textarea',
      admin: {
        readOnly: true,
        description: 'JSON array of { field, before, after } changes',
      },
    },

    // ── When ──
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      index: true,
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime' },
      },
    },

    // ── Metadata ──
    {
      name: 'metadata',
      type: 'textarea',
      admin: {
        readOnly: true,
        description: 'JSON object with IP, user-agent, etc.',
      },
    },
  ],
};

export default AuditLogs;
