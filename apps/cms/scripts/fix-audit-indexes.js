/**
 * Drop old audit-log indexes that used 'collection' field name,
 * then recreate with 'targetCollection'.
 */
const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const col = client.db().collection('audit-logs');

  // Drop conflicting old indexes
  const toDrop = ['idx_collection_timestamp', 'idx_document_history'];
  for (const name of toDrop) {
    try {
      await col.dropIndex(name);
      console.log(`Dropped index: ${name}`);
    } catch (e) {
      console.log(`Index ${name} not found (ok)`);
    }
  }

  // Recreate with correct field name
  await col.createIndex({ targetCollection: 1, timestamp: -1 }, { name: 'idx_targetcollection_timestamp' });
  console.log('Created idx_targetcollection_timestamp');

  await col.createIndex({ targetCollection: 1, documentId: 1, timestamp: -1 }, { name: 'idx_document_history' });
  console.log('Created idx_document_history');

  const indexes = await col.indexes();
  console.log('Current indexes:', indexes.map(i => i.name).join(', '));

  await client.close();
}

main().catch(err => { console.error(err); process.exit(1); });
