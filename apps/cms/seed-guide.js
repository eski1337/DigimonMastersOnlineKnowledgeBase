const payload = require('payload');
const { mongooseAdapter } = require('@payloadcms/db-mongodb');
require('dotenv').config({ path: '../../.env' });

async function seed() {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET || 'dev-secret',
    local: true,
    db: mongooseAdapter({ url: process.env.MONGODB_URI }),
  });

  // Check if guide already exists
  const existing = await payload.find({
    collection: 'guides',
    where: { slug: { equals: 'true-digivice' } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    console.log('Guide already exists, updating...');
    await payload.update({
      collection: 'guides',
      id: existing.docs[0].id,
      data: {
        title: 'True Digivice Guide',
        summary: 'Complete crafting guide for all 11 True Digivice types in Digimon Masters Online. Materials, locations, costs, and resetting guide.',
        tags: [{ tag: 'Equipment' }, { tag: 'Crafting' }, { tag: 'Tokyo-Odaiba' }],
        published: true,
      },
    });
    console.log('Updated guide:', existing.docs[0].id);
  } else {
    const result = await payload.create({
      collection: 'guides',
      data: {
        title: 'True Digivice Guide',
        slug: 'true-digivice',
        summary: 'Complete crafting guide for all 11 True Digivice types in Digimon Masters Online. Materials, locations, costs, and resetting guide.',
        tags: [{ tag: 'Equipment' }, { tag: 'Crafting' }, { tag: 'Tokyo-Odaiba' }],
        published: true,
        content: [{ children: [{ text: 'This guide is rendered via a custom page component. Edit metadata here.' }] }],
      },
    });
    console.log('Created guide:', result.id);
  }

  process.exit(0);
}

seed().catch((e) => {
  console.error('Seed error:', e.message);
  process.exit(1);
});
