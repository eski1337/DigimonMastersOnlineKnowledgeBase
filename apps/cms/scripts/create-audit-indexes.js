/**
 * Create MongoDB indexes for the audit-logs collection.
 * Run once after deploying the AuditLogs collection.
 *
 * Usage: node scripts/create-audit-indexes.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db();
  const collection = db.collection('audit-logs');

  // Compound index for the most common query pattern: latest logs, filterable
  await collection.createIndex(
    { timestamp: -1 },
    { name: 'idx_timestamp_desc' }
  );

  // Filter by action + time
  await collection.createIndex(
    { action: 1, timestamp: -1 },
    { name: 'idx_action_timestamp' }
  );

  // Filter by targetCollection + time
  await collection.createIndex(
    { targetCollection: 1, timestamp: -1 },
    { name: 'idx_collection_timestamp' }
  );

  // Filter by user + time
  await collection.createIndex(
    { user: 1, timestamp: -1 },
    { name: 'idx_user_timestamp' }
  );

  // Text index for searching document titles and user emails
  await collection.createIndex(
    { documentTitle: 'text', userEmail: 'text' },
    { name: 'idx_text_search' }
  );

  // Compound index for document lookup (find all changes to a specific entity)
  await collection.createIndex(
    { targetCollection: 1, documentId: 1, timestamp: -1 },
    { name: 'idx_document_history' }
  );

  // TTL index for optional archival (365 days — remove if you want infinite retention)
  // Uncomment the next line to enable automatic cleanup:
  // await collection.createIndex({ timestamp: 1 }, { name: 'idx_ttl_365d', expireAfterSeconds: 365 * 24 * 60 * 60 });

  console.log('All indexes created successfully');
  
  const indexes = await collection.indexes();
  console.log('Current indexes:', indexes.map(i => i.name).join(', '));

  await client.close();
}

main().catch(err => {
  console.error('Failed to create indexes:', err);
  process.exit(1);
});
