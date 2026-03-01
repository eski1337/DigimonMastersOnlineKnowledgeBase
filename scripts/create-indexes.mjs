#!/usr/bin/env node

/**
 * MongoDB Index Creation Script
 *
 * Run once (or on deploy) to ensure compound indexes exist for
 * filtered queries. Idempotent — safe to run multiple times.
 *
 * Usage:
 *   node scripts/create-indexes.mjs
 *
 * Requires MONGODB_URI env var (reads from .env automatically).
 */

import { MongoClient } from 'mongodb';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set');
  process.exit(1);
}

const INDEXES = [
  // ── Digimon ──────────────────────────────────────────────────
  {
    collection: 'digimon',
    indexes: [
      {
        key: { published: 1, element: 1, attribute: 1, rank: 1, name: 1 },
        name: 'digimon_filter_compound',
      },
      {
        key: { published: 1, form: 1, name: 1 },
        name: 'digimon_form_filter',
      },
      {
        key: { published: 1, attackerType: 1, name: 1 },
        name: 'digimon_attacker_filter',
      },
      {
        key: { published: 1, name: 1 },
        name: 'digimon_published_name',
      },
      {
        key: { slug: 1 },
        name: 'digimon_slug',
        options: { unique: true },
      },
    ],
  },

  // ── Maps ─────────────────────────────────────────────────────
  {
    collection: 'maps',
    indexes: [
      {
        key: { published: 1, world: 1, area: 1, name: 1 },
        name: 'maps_filter_compound',
      },
      {
        key: { published: 1, mapType: 1, name: 1 },
        name: 'maps_type_filter',
      },
      {
        key: { slug: 1 },
        name: 'maps_slug',
        options: { unique: true },
      },
    ],
  },

  // ── Users ────────────────────────────────────────────────────
  {
    collection: 'users',
    indexes: [
      {
        key: { username: 1 },
        name: 'users_username',
        options: { unique: true, sparse: true },
      },
      {
        key: { discordId: 1 },
        name: 'users_discord_id',
        options: { sparse: true },
      },
      {
        key: { role: 1 },
        name: 'users_role',
      },
    ],
  },

  // ── Media ────────────────────────────────────────────────────
  {
    collection: 'media',
    indexes: [
      {
        key: { sourceUrl: 1 },
        name: 'media_source_url',
        options: { sparse: true },
      },
      {
        key: { hash: 1 },
        name: 'media_hash',
        options: { sparse: true },
      },
    ],
  },

  // ── Messages ─────────────────────────────────────────────────
  {
    collection: 'messages',
    indexes: [
      {
        key: { conversation: 1, createdAt: -1 },
        name: 'messages_conversation_date',
      },
    ],
  },

  // ── Profile Comments ─────────────────────────────────────────
  {
    collection: 'profile-comments',
    indexes: [
      {
        key: { profile: 1, createdAt: -1 },
        name: 'profile_comments_profile_date',
      },
    ],
  },

  // ── Notifications ────────────────────────────────────────────
  {
    collection: 'notifications',
    indexes: [
      {
        key: { recipient: 1, read: 1, createdAt: -1 },
        name: 'notifications_recipient',
      },
    ],
  },

  // ── Audit Logs ───────────────────────────────────────────────
  {
    collection: 'audit-logs',
    indexes: [
      {
        key: { user: 1, createdAt: -1 },
        name: 'audit_logs_user_date',
      },
      {
        key: { collection: 1, createdAt: -1 },
        name: 'audit_logs_collection_date',
      },
    ],
  },
];

async function main() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(); // uses DB from connection string
    console.log(`Connected to: ${db.databaseName}\n`);

    for (const { collection, indexes } of INDEXES) {
      const col = db.collection(collection);
      for (const idx of indexes) {
        try {
          await col.createIndex(idx.key, {
            name: idx.name,
            background: true,
            ...(idx.options || {}),
          });
          console.log(`  ✓ ${collection}.${idx.name}`);
        } catch (err) {
          // Index might already exist with different options — log and continue
          console.log(`  ⚠ ${collection}.${idx.name}: ${err.message}`);
        }
      }
    }

    console.log('\nDone.');
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
