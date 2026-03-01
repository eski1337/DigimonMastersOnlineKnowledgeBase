# Part 8 — Edge Cases & Graph Integrity

## 8.1 Jogress / DNA (Two Parents → One Result)

**Data model**: Two separate edges pointing to the same target.

```
Digimon A ──(jogress, partner=B)──→ Result C
Digimon B ──(jogress, partner=A)──→ Result C
```

Both edges have `evolutionType: 'jogress'` and cross-reference via `jogressPartner`.
The BFS naturally discovers both parents when traversing "up" from C.

**Visual rendering**: The `EvolutionEdge` component renders jogress edges in purple (`#a855f7`).
The edge label shows "Jogress". The `jogressPartner` field allows the UI to draw
a visual indicator (dashed line or badge) linking the two parents.

**Migration**: The existing `jogress[]` array on each Digimon creates one edge per entry.
Both A and B's jogress arrays should reference C, creating the bidirectional pair.

## 8.2 Multiple Evolution Types Between Same Pair

**Scenario**: Agumon → Greymon via "normal" AND via "digi-egg" (different requirements).

**Data model**: The compound unique index is `(source, target, evolutionType)`.
Two edges with different `evolutionType` values are allowed:

```
{ source: agumon, target: greymon, evolutionType: 'normal',   requiredLevel: 25 }
{ source: agumon, target: greymon, evolutionType: 'digi-egg', requiredItem: 'Digi-Egg of Courage' }
```

**Visual**: React Flow renders both edges. Bezier paths auto-separate slightly when
multiple edges share source+target. Edge labels distinguish them.

## 8.3 Slide Evolution

**Data model**: `evolutionType: 'slide'`. Slide evolutions are typically between
same-stage Digimon (e.g. two Megas). No level requirement, often no item.

```
{ source: wargreymon, target: blackwargreymon, evolutionType: 'slide' }
```

**Visual**: Amber-colored edge (`#f59e0b`). Slide edges often create horizontal
connections in the graph (same dagre rank). The layout algorithm handles this
automatically since dagre assigns ranks based on incoming edge depth.

## 8.4 Mode Changes

**Data model**: `evolutionType: 'mode-change'`. Mode changes are reversible
transformations (e.g. Imperialdramon Dragon Mode ↔ Fighter Mode).

```
{ source: imperialdramon-dm, target: imperialdramon-fm, evolutionType: 'mode-change' }
{ source: imperialdramon-fm, target: imperialdramon-dm, evolutionType: 'mode-change' }
```

Two edges (bidirectional). Both are valid.

**Cycle handling**: BFS uses a `visited` set. Even though A→B and B→A exist,
each node is only visited once. The edges are still collected and rendered,
but traversal doesn't loop.

## 8.5 X-Antibody Variants

**Data model**: `evolutionType: 'x-antibody'`.

```
{ source: wargreymon, target: wargreymon-x, evolutionType: 'x-antibody',
  requiredItem: 'X-Antibody Factor' }
```

Typically a one-way edge from the base form to the X form.
The X form may also have its own normal evolution edges to other Digimon.

## 8.6 Variant Forms (Seasonal, Event-Specific)

**Data model**: `evolutionType: 'variant'`.

```
{ source: agumon, target: agumon-christmas, evolutionType: 'variant' }
```

Variants are cosmetic/alternate forms, not traditional evolutions.
Represented as green edges (`#84cc16`) in the graph.

## 8.7 Cross-Tree Shared Digimon

**Scenario**: Digimon C appears in multiple evolution lines
(e.g. Gatomon can be reached from both Salamon and Tailmon lines).

**Data model**: C simply has multiple incoming edges from different sources.
No special handling needed — the graph data model naturally supports this.

**BFS behavior**: When traversing from any Digimon, BFS discovers all connected
nodes regardless of which "line" they belong to. A Digimon appearing in 5 lines
is just a node with 5+ incoming/outgoing edges.

**Layout**: The graph may become wide. The `MAX_NODES = 500` limit prevents
runaway expansion. The depth parameter allows the user to control how far
the traversal goes.

## 8.8 Self-Referential Corruption

**Prevention layers**:

1. **Payload `beforeValidate` hook**: Throws error if `source === target`
2. **MongoDB `$expr` validator**: `{ $ne: ['$source', '$target'] }`
3. **Batch create endpoint**: Checks `edge.source === edge.target` before create
4. **Migration script**: Counts and skips self-loops

**Detection query** (admin maintenance):

```js
db.getCollection('evolution-edges').find({
  $expr: { $eq: ['$source', '$target'] }
});
```

## 8.9 Graph Integrity Validation

### Orphan edge detection

Edges where source or target Digimon no longer exists:

```ts
// Admin maintenance endpoint
async function findOrphanEdges(payload: Payload): Promise<any[]> {
  const allEdges = await payload.find({
    collection: 'evolution-edges', limit: 5000, depth: 0,
  });

  const orphans: any[] = [];
  const digimonCache = new Map<string, boolean>();

  for (const edge of allEdges.docs) {
    const sourceId = String(edge.source);
    const targetId = String(edge.target);

    for (const id of [sourceId, targetId]) {
      if (!digimonCache.has(id)) {
        try {
          const doc = await payload.findByID({ collection: 'digimon', id, depth: 0 });
          digimonCache.set(id, !!doc);
        } catch {
          digimonCache.set(id, false);
        }
      }
      if (!digimonCache.get(id)) {
        orphans.push({ edgeId: edge.id, missingDigimon: id });
      }
    }
  }

  return orphans;
}
```

### Duplicate edge detection

Should not exist given the compound unique index, but as a safety check:

```js
db.getCollection('evolution-edges').aggregate([
  {
    $group: {
      _id: { source: '$source', target: '$target', type: '$evolutionType' },
      count: { $sum: 1 },
      ids: { $push: '$_id' },
    },
  },
  { $match: { count: { $gt: 1 } } },
]);
```

### Disconnected subgraph detection

Find Digimon that have edges but are unreachable from any "root" (In-Training forms):

```ts
async function findDisconnected(payload: Payload): Promise<string[]> {
  // 1. Get all In-Training Digimon as roots
  const roots = await payload.find({
    collection: 'digimon',
    where: { form: { equals: 'In-Training' } },
    limit: 500, depth: 0,
  });

  // 2. BFS from all roots simultaneously
  const reachable = new Set<string>();
  let frontier = new Set(roots.docs.map((d: any) => String(d.id)));
  for (const id of frontier) reachable.add(id);

  while (frontier.size > 0) {
    const edges = await payload.find({
      collection: 'evolution-edges',
      where: { source: { in: Array.from(frontier) } },
      limit: 5000, depth: 0,
    });

    const next = new Set<string>();
    for (const edge of edges.docs) {
      const targetId = String(edge.target);
      if (!reachable.has(targetId)) {
        reachable.add(targetId);
        next.add(targetId);
      }
    }
    frontier = next;
  }

  // 3. Find all Digimon with edges but NOT in reachable set
  const allEdged = await payload.find({
    collection: 'evolution-edges',
    limit: 5000, depth: 0,
  });
  const edgedDigimon = new Set<string>();
  for (const e of allEdged.docs) {
    edgedDigimon.add(String(e.source));
    edgedDigimon.add(String(e.target));
  }

  return Array.from(edgedDigimon).filter((id) => !reachable.has(id));
}
```

## 8.10 Edge Type Validation Rules

| Type | Source Stage | Target Stage | Required Fields | Notes |
|------|------------|-------------|-----------------|-------|
| `normal` | Any | Next stage | — | Most common |
| `jogress` | Any | Any | `jogressPartner` | Two parents merge |
| `digi-egg` | Rookie-ish | Armor | `requiredItem` (egg name) | Digi-Egg specific |
| `x-antibody` | Any | Same+X | `requiredItem` (X-Factor) | Usually same stage |
| `variant` | Any | Same stage | — | Cosmetic/seasonal |
| `alternate` | Any | Any | — | Non-standard path |
| `slide` | Mega+ | Mega+ | — | Same-stage swap |
| `mode-change` | Any | Same Digimon variant | — | Usually bidirectional |

These rules are **advisory**, not enforced at the DB level, because DMO has
exceptions to every pattern. The CMS admin UI can show warnings but should
not block saves.
