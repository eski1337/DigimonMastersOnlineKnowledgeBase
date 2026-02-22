import { CollectionConfig } from 'payload/types';

const EvolutionLines: CollectionConfig = {
  slug: 'evolution-lines',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'rootDigimon', 'digimonCount', 'updatedAt'],
    group: 'Content',
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
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: {
        description: 'Name of the evolution line (e.g., "Guilmon Line", "Agumon Line")',
      },
    },
    {
      name: 'rootDigimon',
      type: 'relationship',
      relationTo: 'digimon',
      required: true,
      admin: {
        description: 'The primary/root Digimon of this evolution line',
      },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: {
        description: 'Optional description of this evolution line',
      },
    },
    {
      name: 'visualLayout',
      type: 'json',
      admin: {
        description: 'Visual evolution tree layout (nodes and connections)',
      },
    },
    {
      name: 'digimonInLine',
      type: 'relationship',
      relationTo: 'digimon',
      hasMany: true,
      admin: {
        description: 'All Digimon that are part of this evolution line',
      },
    },
    {
      name: 'digimonCount',
      type: 'number',
      admin: {
        description: 'Number of Digimon in this line (auto-calculated)',
        readOnly: true,
      },
      hooks: {
        beforeChange: [
          ({ data }) => {
            if (data && data.digimonInLine && Array.isArray(data.digimonInLine)) {
              return data.digimonInLine.length;
            }
            return 0;
          },
        ],
      },
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Whether this evolution line is publicly visible',
      },
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req, operation: _operation }) => {
        // When evolution line is created/updated, update all Digimon in the line
        if (doc.digimonInLine && Array.isArray(doc.digimonInLine)) {
          for (const digimonRef of doc.digimonInLine) {
            const digimonId = typeof digimonRef === 'string' ? digimonRef : digimonRef.id;
            
            try {
              await req.payload.update({
                collection: 'digimon',
                id: digimonId,
                data: {
                  evolutionLine: doc.id,
                },
              });
            } catch (error) {
              console.error(`Failed to update Digimon ${digimonId} with evolution line:`, error);
            }
          }
        }
      },
    ],
  },
};

export default EvolutionLines;
