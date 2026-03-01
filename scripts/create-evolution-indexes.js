/**
 * Create MongoDB indexes for the Evolution Graph collections.
 *
 * Run BEFORE migration, on an empty collection, to guarantee uniqueness
 * enforcement from the very first insert.
 *
 * Usage:
 *   mongosh dmo-kb-prod scripts/create-evolution-indexes.js
 *
 * Or via connection string:
 *   mongosh "mongodb://localhost:27017/dmo-kb-prod" scripts/create-evolution-indexes.js
 */

// ── evolution-edges ──────────────────────────────────────────────────

// Compound unique: prevents duplicate edges of the same type between two Digimon
db.getCollection('evolution-edges').createIndex(
  { source: 1, target: 1, evolutionType: 1 },
  { unique: true, name: 'ux_source_target_type', background: true }
);

// Single-field indexes for BFS traversal queries (forward + backward)
db.getCollection('evolution-edges').createIndex(
  { source: 1 },
  { name: 'ix_source', background: true }
);

db.getCollection('evolution-edges').createIndex(
  { target: 1 },
  { name: 'ix_target', background: true }
);

// ── evolution-graph-layouts ──────────────────────────────────────────

// Unique on rootDigimon: one layout per Digimon (Payload creates this
// automatically from `unique: true` on the field, but we ensure it
// explicitly in case the collection is created before Payload boots).
db.getCollection('evolution-graph-layouts').createIndex(
  { rootDigimon: 1 },
  { unique: true, name: 'ux_root_digimon', background: true }
);

// ── Verification ─────────────────────────────────────────────────────

print('\n=== evolution-edges indexes ===');
printjson(db.getCollection('evolution-edges').getIndexes());

print('\n=== evolution-graph-layouts indexes ===');
printjson(db.getCollection('evolution-graph-layouts').getIndexes());

print('\n✓ All evolution graph indexes created successfully.');
