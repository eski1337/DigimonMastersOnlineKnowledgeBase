# Part 2 — MongoDB Indexes & Validation

## 2.1 Indexes (run via `mongosh` or migration script)

```js
// ── evolution-edges ──────────────────────────────────────────

// BFS: "all edges FROM this Digimon"
db.getCollection('evolution-edges').createIndex(
  { source: 1 },
  { name: 'idx_source' }
);

// BFS: "all edges TO this Digimon"
db.getCollection('evolution-edges').createIndex(
  { target: 1 },
  { name: 'idx_target' }
);

// Filter by type
db.getCollection('evolution-edges').createIndex(
  { evolutionType: 1 },
  { name: 'idx_evolution_type' }
);

// Compound unique: no duplicate (source, target, type) triples
db.getCollection('evolution-edges').createIndex(
  { source: 1, target: 1, evolutionType: 1 },
  { unique: true, name: 'ux_source_target_type' }
);

// BFS batch query: edges in/out of a set of nodes
db.getCollection('evolution-edges').createIndex(
  { source: 1, target: 1 },
  { name: 'idx_source_target' }
);


// ── evolution-graph-layouts ──────────────────────────────────

// Default layout for a Digimon
db.getCollection('evolution-graph-layouts').createIndex(
  { rootDigimon: 1, isDefault: 1 },
  { name: 'idx_root_default' }
);
```

## 2.2 Self-Loop Prevention (DB-level)

```js
db.runCommand({
  collMod: 'evolution-edges',
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      properties: {
        source: { bsonType: 'objectId' },
        target: { bsonType: 'objectId' },
      },
    },
    $expr: { $ne: ['$source', '$target'] },
  },
  validationLevel: 'strict',
  validationAction: 'error',
});
```

## 2.3 Why Not PostgreSQL?

The project uses `@payloadcms/db-mongodb v1.7.2`. The MongoDB adapter auto-creates
collections and basic `_id` indexes. Payload v2 with mongoose stores relationships
as ObjectId references. The compound unique index `ux_source_target_type` provides
the same guarantee as a PostgreSQL `UNIQUE(source, target, evolution_type)` constraint.

ON DELETE CASCADE does not exist in MongoDB. This is handled by the
Payload `afterDelete` hook on the `digimon` collection (see Part 1, §1.4).
