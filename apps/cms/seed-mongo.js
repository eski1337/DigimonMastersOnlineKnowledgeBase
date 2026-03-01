// Run with: mongosh mongodb://localhost:27017/dmo-kb seed-mongo.js
const now = new Date();
const exists = db.guides.countDocuments({ slug: 'true-digivice' });
if (exists > 0) {
  print('Guide already exists, skipping.');
} else {
  db.guides.insertOne({
    title: 'True Digivice Guide',
    slug: 'true-digivice',
    summary: 'Complete crafting guide for all 11 True Digivice types in Digimon Masters Online. Materials, locations, costs, and resetting guide.',
    tags: [
      { tag: 'Equipment' },
      { tag: 'Crafting' },
      { tag: 'Tokyo-Odaiba' },
    ],
    published: true,
    content: [
      {
        children: [
          { text: 'This guide is rendered via a custom page component. Edit metadata (title, summary, tags, published status) here in the CMS.' },
        ],
      },
    ],
    createdAt: now,
    updatedAt: now,
  });
  print('Created True Digivice guide.');
}
