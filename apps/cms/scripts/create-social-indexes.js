/**
 * Create MongoDB indexes for the social system collections.
 * Run once after deploying the new collections.
 *
 * Usage: MONGODB_URI=mongodb://... node scripts/create-social-indexes.js
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dmo-kb';

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('Connected to MongoDB');

  const db = client.db();

  // Helper: create index, skip if already exists with different name
  async function safeIndex(col, keys, opts) {
    try { await col.createIndex(keys, opts); }
    catch (e) { console.log(`  Skipped ${opts.name}: ${e.codeName || e.message}`); }
  }

  // ── Profile Comments ──
  const pc = db.collection('profile-comments');
  await safeIndex(pc, { profile: 1, createdAt: -1 }, { name: 'idx_profile_time' });
  await safeIndex(pc, { author: 1, createdAt: -1 }, { name: 'idx_author_time' });
  // parent_1 is auto-created by Payload, skip our custom name
  console.log('Profile Comments indexes created');

  // ── Conversations ──
  const conv = db.collection('conversations');
  await safeIndex(conv, { 'participants.user': 1, lastMessageAt: -1 }, { name: 'idx_participant_lastmsg' });
  await safeIndex(conv, { lastMessageAt: -1 }, { name: 'idx_lastmsg_desc' });
  console.log('Conversations indexes created');

  // ── Messages ──
  const msg = db.collection('messages');
  await safeIndex(msg, { conversation: 1, createdAt: -1 }, { name: 'idx_conv_time' });
  await safeIndex(msg, { sender: 1, createdAt: -1 }, { name: 'idx_sender_time' });
  console.log('Messages indexes created');

  // ── Notifications ──
  const notif = db.collection('notifications');
  await safeIndex(notif, { recipient: 1, isRead: 1, createdAt: -1 }, { name: 'idx_recipient_unread_time' });
  await safeIndex(notif, { recipient: 1, createdAt: -1 }, { name: 'idx_recipient_time' });
  console.log('Notifications indexes created');

  // ── User Blocks ──
  const blocks = db.collection('user-blocks');
  await safeIndex(blocks, { blocker: 1, blocked: 1 }, { name: 'idx_blocker_blocked', unique: true });
  await safeIndex(blocks, { blocked: 1 }, { name: 'idx_blocked' });
  console.log('User Blocks indexes created');

  // ── Reports ──
  const reports = db.collection('reports');
  await safeIndex(reports, { status: 1, createdAt: -1 }, { name: 'idx_status_time' });
  await safeIndex(reports, { reporter: 1, createdAt: -1 }, { name: 'idx_reporter_time' });
  await safeIndex(reports, { targetUser: 1 }, { name: 'idx_target_user' });
  console.log('Reports indexes created');

  // ── Users (profile fields) ──
  const users = db.collection('users');
  await safeIndex(users, { username: 1 }, { name: 'idx_username', unique: true, sparse: true });
  await safeIndex(users, { profileVisibility: 1 }, { name: 'idx_profile_visibility' });
  console.log('Users profile indexes created');

  // Summary
  for (const colName of ['profile-comments', 'conversations', 'messages', 'notifications', 'user-blocks', 'reports']) {
    const idx = await db.collection(colName).indexes();
    console.log(`${colName}: ${idx.map(i => i.name).join(', ')}`);
  }

  await client.close();
  console.log('Done');
}

main().catch(err => { console.error(err); process.exit(1); });
