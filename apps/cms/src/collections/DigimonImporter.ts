import { CollectionConfig } from 'payload/types';

const DigimonImporter: CollectionConfig = {
  slug: 'digimon-importer',
  admin: {
    useAsTitle: 'name',
    group: 'Tools',
    hidden: ({ user }) => !user || !['editor', 'admin', 'owner'].includes((user as any).role ?? ''),
    disableDuplicate: true,
    description: 'Click "Create New" to import a Digimon from DMO Wiki',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false;
      return ['editor', 'admin', 'owner'].includes(user.role);
    },
    create: ({ req: { user } }) => {
      if (!user) return false;
      return ['editor', 'admin', 'owner'].includes(user.role);
    },
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Enter Digimon name or paste dmowiki.com URL',
        placeholder: 'e.g., Agumon or https://dmowiki.com/Agumon',
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, req: _req }) => {
        // Redirect to import page instead
        if (typeof window !== 'undefined') {
          window.open(`/import-digimon?name=${encodeURIComponent(data.name)}`, '_blank');
        }
        throw new Error('Please use the import page that just opened');
      },
    ],
  },
};

export default DigimonImporter;
