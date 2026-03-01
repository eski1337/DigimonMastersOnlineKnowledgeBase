# Pre-Launch Failure Simulation & Hardening Review

> Reliability audit for Evolution Graph system before public feature flag activation.
> Assumes something WILL break. Pessimistic by design.

---

## 1. Top 10 Critical Failure Scenarios (Ranked by Severity)

### F1. BFS $in Query Explodes on Heavily Connected Graphs (SEVERITY: CRITICAL)

**Scenario**: A popular Digimon like Agumon sits at the center of a massive evolution web. BFS at depth=5 discovers 400+ node IDs. The batch Digimon fetch query becomes `{ id: { $in: [400 ObjectIds] } }` with `depth: 1` (populates `icon` relationship). MongoDB must join 400 documents × 1 relationship each = 800 reads. CMS single-instance Express blocks on this. All other API requests queue behind it.

**Why this is realistic**: The current `getDigivolutionTree` already loads ALL 1000+ Digimon into memory (`findAllPaginated(1)`). The new system is better per-query, but a single expensive request still blocks the single-threaded CMS process.

**Root cause in spec**: `@D:\Windsurf Projekte\DMOKBNEW\docs\spec\03-api-routes.md:1` — the batch node fetch uses `depth: 1` to populate icons. For 400+ nodes, this is a heavy query.

**Compounding factor**: CMS runs as single PM2 instance (`exec_mode: 'fork'`) per `@D:\Windsurf Projekte\DMOKBNEW\ecosystem.config.js:28-29`. No request concurrency isolation.

---

### F2. In-Memory Cache Stampede After CMS Restart (SEVERITY: CRITICAL)

**Scenario**: PM2 restarts CMS (crash, deploy, or `max_memory_restart: '1G'`). In-memory LRU cache is wiped. Next 50 concurrent page loads all miss cache simultaneously. Each triggers a full BFS traversal. MongoDB receives 50 × 8 = 400 queries within seconds. CMS event loop saturates. Response times spike to 10+ seconds. PM2 detects unresponsive process, restarts again. Loop continues.

**Why this is realistic**: ISR revalidation is 5 seconds. After a restart, every Digimon page visited within 5s triggers a fresh API call. With crawlers + real users, 50 concurrent hits is plausible.

**Root cause**: No request coalescing (deduplication). If 50 requests for `?digimon=agumon` arrive simultaneously, 50 independent BFS traversals execute.

---

### F3. Migration Creates Edges With Wrong Direction (SEVERITY: HIGH)

**Scenario**: The migration script processes Digimon A's `digivolvesFrom: ["B"]` and creates edge `B → A`. Separately, it processes B's `digivolvesTo: ["A"]` and tries to create edge `B → A` again. The dedup key catches this. BUT: what if A's `digivolvesFrom` lists "B" while B's `digivolvesTo` does NOT list "A" (inconsistent source data)? The migration creates edge `B → A` based only on A's claim, with no level/item metadata (because it tries to find the matching entry in B's `digivolvesTo` and fails).

**Result**: Ghost edges with null requirements. Graph looks correct structurally but missing level/item metadata on some edges.

**Why this is realistic**: DMO Wiki data is scraped. Inconsistencies between `digivolvesFrom` and `digivolvesTo` across different Digimon documents are guaranteed.

---

### F4. Conditions JSON Field Stores Arbitrary Payload (SEVERITY: HIGH)

**Scenario**: The `conditions` field on `evolution-edges` is `type: 'json'` with no schema validation. An editor (or API abuse) stores:
```json
{"__proto__": {"isAdmin": true}, "constructor": {"prototype": {"isAdmin": true}}}
```
Or a 5MB JSON blob. Or a deeply nested object (1000 levels deep) that causes `JSON.stringify` stack overflow when serialized for the API response.

**Root cause in spec**: `@D:\Windsurf Projekte\DMOKBNEW\docs\spec\01-cms-collections.md:1` — the `conditions` field has no `validate` hook, no max size, no schema constraint.

**Compounding factor**: CMS body parser accepts up to 10MB (`express.json({ limit: '10mb' })`) per `@D:\Windsurf Projekte\DMOKBNEW\apps\cms\src\app.ts:18`.

---

### F5. Layout Save Race Condition Overwrites Concurrent Admin Edits (SEVERITY: HIGH)

**Scenario**: Admin A opens Agumon's graph, moves 20 nodes. Admin B opens the same graph, moves 5 nodes. Admin A saves (writes 20 positions). Admin B saves 3 seconds later (writes only their 5 positions). Admin B's save includes the OLD positions of the 20 nodes A moved, because B loaded the graph before A saved.

**Result**: A's 20-node rearrangement is silently reverted. No conflict detection. No warning.

**Root cause in spec**: The layout save endpoint (`PUT /api/evolution-graph-layouts/save`) does a full replace of the `positions` JSON. No merge, no versioning, no optimistic locking.

---

### F6. React Flow Memory Leak on Repeated Navigation (SEVERITY: MEDIUM-HIGH)

**Scenario**: User browses 30 Digimon profiles in sequence (clicking through evolutions). Each page mounts a new `<EvolutionGraph>` with `<ReactFlowProvider>`. Each instance allocates a Zustand store, DOM event listeners, ResizeObserver, and IntersectionObserver. If unmount cleanup is incomplete, memory grows linearly. After 30 navigations, browser tab uses 500MB+ and becomes sluggish.

**Why this is realistic**: React Flow v12 allocates significant internal state. Next.js App Router soft-navigations may not trigger full unmount/remount cycles, leaving zombie listeners.

**Compounding factor**: `useEvolutionGraphData` has an `AbortController` cleanup, but the React Flow instance itself has no explicit teardown in the spec.

---

### F7. MongoDB Compound Unique Index Prevents Legitimate Multi-Type Edges During Migration (SEVERITY: MEDIUM-HIGH)

**Scenario**: Migration script runs. For Digimon pair (A, B), it creates edge `A → B (normal)`. Later in the same run, it encounters a jogress entry that also goes `A → B (jogress)`. The dedup key in the script is `source|target|type`, so this passes. But if the MongoDB unique index `ux_source_target_type` was created BEFORE migration, and the migration encounters a race condition or retry, it could fail mid-batch.

**More likely scenario**: Index creation on a large collection with existing documents takes time. If the migration script creates 500 edges and THEN the index creation runs, MongoDB must validate all 500 edges for uniqueness. If any duplicates slipped through (e.g., from bidirectional processing), the index creation fails entirely with `E11000 duplicate key error`.

**Result**: No unique index. The entire uniqueness guarantee is lost. Duplicate edges accumulate over time.

---

### F8. /digivolutions Redirect Breaks Google's Cached Full-Page Graph (SEVERITY: MEDIUM)

**Scenario**: Google has indexed `/digimon/agumon-classic/digivolutions` as a rich, standalone page with stats (node count, edge count, legend). The redirect sends users to `/digimon/agumon-classic`, which shows the evolution graph as one section among many. Google may interpret this as content degradation. Core Web Vitals may worsen (larger page, more JS). Search ranking for "Agumon evolution tree" could drop.

**Why this is realistic**: The old `/digivolutions` page has unique content (stats grid, Cytoscape chart). The replacement is a smaller inline React Flow graph. Google's quality raters penalize pages that redirect to less specific content.

**Compounding factor**: The redirect is 308 (permanent). Once Google processes it, there's no easy un-redirect.

---

### F9. Edge Deletion During Active BFS Read Returns Partial Graph (SEVERITY: MEDIUM)

**Scenario**: Admin deletes an edge while a user's BFS traversal is mid-flight. BFS level 0-2 completes fine. At level 3, one of the frontier nodes had an edge that was just deleted. The query returns fewer edges. The resulting graph has a "dead end" — a node that appears connected to nothing on one side.

**This is technically correct behavior** (the edge was deleted), but the user sees an incomplete graph that doesn't match what they'd see on a fresh load 1 second later.

**Compounding factor**: The in-memory cache serves stale data for 5 minutes. So some users see the old complete graph (cached), while others see the partial graph (cache miss during deletion window).

---

### F10. Mobile Safari Viewport Overflow from React Flow SVG (SEVERITY: MEDIUM)

**Scenario**: React Flow renders nodes using absolute-positioned divs and edges using SVG paths. On iOS Safari, the React Flow container's `touch-action: none` CSS conflicts with Safari's scroll behavior. Users cannot scroll past the graph on the page. The graph "captures" all touch events, making the page appear frozen below the graph section.

**Why this is realistic**: This is a known React Flow issue on iOS Safari. The `@xyflow/react` library has had multiple issues filed about mobile touch handling.

---

## 2. Detection Strategy

| # | Failure | Detection Method | Signal |
|---|---------|-----------------|--------|
| F1 | BFS query explosion | CMS pino logs: response time > 2s | `pm2 logs dmo-kb-cms \| grep "evolution-graph"` + look for slow responses |
| F2 | Cache stampede | Metrics endpoint: `requestsPerSec` spike + `activeRequests` > 10 | `/api/internal/metrics` — already exists in CMS |
| F3 | Wrong-direction edges | Post-migration validation script comparing old→new | Custom script (see §3) |
| F4 | JSON injection | MongoDB query for oversized conditions | `db.getCollection('evolution-edges').find({ $where: "JSON.stringify(this.conditions).length > 10000" })` |
| F5 | Layout race condition | Admin reports "my changes disappeared" | No automated detection — requires user report |
| F6 | React Flow memory leak | Browser DevTools Memory tab after 20 navigations | Manual test during Phase 4 |
| F7 | Missing unique index | `db.getCollection('evolution-edges').getIndexes()` — check `ux_source_target_type` exists | Post-migration check script |
| F8 | SEO degradation | Google Search Console Coverage report + position tracking | Check daily for 2 weeks after launch |
| F9 | Partial graph during deletion | Compare graph response before/after edge deletion | Unlikely to detect in production — design-level acceptance |
| F10 | Mobile Safari overflow | Manual testing on iOS device | Must test during Phase 4 |

---

## 3. Mitigation Strategy (Preventive Hardening)

### M1. Request Coalescing for BFS (Fixes F1 + F2)

Add a per-slug inflight deduplication layer. If two requests for the same slug+depth+direction arrive simultaneously, the second waits for the first's result instead of executing a parallel BFS.

```ts
// In evolution.controller.ts — add BEFORE the getEvolutionGraph handler:

const inflightRequests = new Map<string, Promise<any>>();

function coalesceKey(slug: string, depth: number, direction: string): string {
  return `${slug}:${depth}:${direction}`;
}

// Inside getEvolutionGraph, wrap the entire logic:
const key = coalesceKey(slug, depth, direction);
const inflight = inflightRequests.get(key);
if (inflight) {
  const result = await inflight;
  res.setHeader('X-Cache', 'COALESCED');
  res.json(result);
  return;
}

const promise = (async () => {
  // ... existing BFS + node fetch + layout fetch ...
  return response;
})();

inflightRequests.set(key, promise);
try {
  const result = await promise;
  setCache(slug, depth, direction, result);
  res.setHeader('X-Cache', 'MISS');
  res.json(result);
} finally {
  inflightRequests.delete(key);
}
```

**Cost**: ~15 lines of code. Eliminates thundering herd entirely.

### M2. Cap Node Fetch to Projection-Only (Fixes F1)

The batch Digimon fetch uses `depth: 1` to populate the `icon` relationship. For 400 nodes, this is 800 DB reads. Instead, fetch with `depth: 0` and resolve icon URLs from a lightweight in-memory index.

```ts
// Change:
const nodeResult = await payload.find({
  collection: 'digimon',
  where: { id: { in: Array.from(nodeIds) } },
  limit: nodeIds.size,
  depth: 0,  // ← was depth: 1
});

// Then resolve icons from a separate lightweight query or accept icon as string field
```

**Alternative**: Add an `iconUrl` text field to the Digimon collection that stores the resolved URL. Denormalized but eliminates the join entirely.

### M3. Conditions Field Validation (Fixes F4)

```ts
// In EvolutionEdges collection, add validate hook to conditions field:
{
  name: 'conditions',
  type: 'json',
  validate: (value: any) => {
    if (value === null || value === undefined) return true;
    const str = JSON.stringify(value);
    if (str.length > 5000) return 'Conditions JSON must be under 5KB';
    // Check nesting depth
    let depth = 0, maxDepth = 0;
    for (const ch of str) {
      if (ch === '{' || ch === '[') { depth++; maxDepth = Math.max(maxDepth, depth); }
      if (ch === '}' || ch === ']') depth--;
    }
    if (maxDepth > 10) return 'Conditions JSON nesting too deep (max 10 levels)';
    // Block prototype pollution keys
    if (str.includes('__proto__') || str.includes('constructor')) {
      return 'Conditions JSON contains forbidden keys';
    }
    return true;
  },
},
```

### M4. Layout Optimistic Locking (Fixes F5)

Add an `updatedAt` check before saving:

```ts
// In saveLayout handler, after finding existing layout:
if (existing.docs[0]) {
  const serverUpdatedAt = new Date(existing.docs[0].updatedAt).getTime();
  const clientUpdatedAt = req.body.lastKnownUpdatedAt;
  if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
    res.status(409).json({
      success: false,
      error: 'Layout was modified by another user. Reload and try again.',
      serverUpdatedAt,
    });
    return;
  }
  // ... proceed with update
}
```

Frontend: Include `lastKnownUpdatedAt` in the save request. Show conflict dialog on 409.

### M5. Mobile Touch Handling (Fixes F10)

Add to the React Flow container wrapper:

```css
/* In evolution-graph.module.css */
.container {
  /* ... existing styles ... */
  touch-action: pan-y;  /* Allow vertical page scroll, let React Flow handle horizontal */
}

/* React Flow's internal pane */
.container :global(.react-flow__pane) {
  touch-action: none;  /* React Flow handles all touch within the pane */
}
```

And set a fixed height with explicit `overflow: hidden` on the container. Do NOT use `100vh` or dynamic height on mobile.

### M6. Migration Metadata Validation (Fixes F3)

After migration, run a validation script that compares edge metadata:

```ts
// scripts/validate-migration.ts
// For every edge where requiredLevel is null and requiredItem is null:
// Check if the source Digimon's digivolvesTo entry for the target has level/item
// If yes → the migration missed metadata. Log it.

const edgesWithoutMeta = await payload.find({
  collection: 'evolution-edges',
  where: {
    and: [
      { evolutionType: { equals: 'normal' } },
      { requiredLevel: { exists: false } },
      { requiredItem: { exists: false } },
    ],
  },
  limit: 5000,
  depth: 0,
});

for (const edge of edgesWithoutMeta.docs) {
  const source = await payload.findByID({ collection: 'digimon', id: edge.source, depth: 0 });
  const target = await payload.findByID({ collection: 'digimon', id: edge.target, depth: 0 });
  const match = source?.digivolutions?.digivolvesTo?.find((e: any) => e.name === target?.name);
  if (match?.requiredLevel || match?.requiredItem) {
    console.log(`MISSING METADATA: ${source.name} → ${target.name}: level=${match.requiredLevel}, item=${match.requiredItem}`);
  }
}
```

### M7. Index Creation Order (Fixes F7)

Create indexes BEFORE running migration. The unique index on an empty collection succeeds instantly. Then as migration inserts documents, the index enforces uniqueness in real-time, catching any script dedup bugs.

```bash
# CORRECT ORDER:
mongosh dmo-kb-prod < scripts/create-evolution-indexes.js  # Step 1: indexes on empty collection
npx ts-node scripts/migrate-evolution-edges.ts              # Step 2: migration (index enforces uniqueness)
```

This is a change from the rollout plan (which had indexes after migration). Update Phase 2 step order.

---

## 4. Containment Strategy (Limit Blast Radius)

### C1. API Response Timeout

Add a hard timeout to the BFS handler. If traversal takes > 5 seconds, return partial results:

```ts
// In getEvolutionGraph:
const timeout = setTimeout(() => {
  // Set a flag that BFS checks each iteration
  abortTraversal = true;
}, 5000);

// In bfsTraverse loop:
if (abortTraversal) break;

// After traversal:
clearTimeout(timeout);
if (abortTraversal) {
  res.setHeader('X-Truncated', 'true');
  // Still return whatever nodes/edges were collected
}
```

### C2. Edge Count Hard Cap Per Request

The spec has `MAX_NODES = 500` but no edge cap. A graph with 200 nodes could have 2000+ edges (highly connected). Add:

```ts
const MAX_EDGES = 2000;
// In bfsTraverse, after adding edges:
if (allEdges.length >= MAX_EDGES) break;
```

### C3. Separate CMS Rate Limit for Evolution Graph

Payload's global rate limit is 2000/15min (very generous). Add a per-endpoint limit:

```ts
// In evolution.routes.ts:
const graphBuckets = new Map<string, { count: number; reset: number }>();

function graphRateLimit(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  let bucket = graphBuckets.get(ip);
  if (!bucket || bucket.reset < now) {
    bucket = { count: 0, reset: now + 60_000 };
    graphBuckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > 30) { // 30 graph requests per minute per IP
    res.status(429).json({ error: 'Too many graph requests' });
    return;
  }
  next();
}

router.get('/api/evolution-graph', graphRateLimit, (req, res) => ctrl.getEvolutionGraph(req, res));
```

### C4. Graceful Degradation on Graph Load Failure

If the evolution graph API fails, the frontend should show the old-style text-based evolution list as fallback, not a blank area:

```tsx
// In EvolutionGraphViewer:
if (error) {
  return (
    <div className={styles.container} style={{ height: 'auto' }}>
      <div className={styles.fallbackList}>
        <p className="text-sm text-muted-foreground">
          Evolution graph temporarily unavailable. 
          <a href={`/digimon/${slug}/digivolutions`}>View full tree →</a>
        </p>
      </div>
    </div>
  );
}
```

During the dual-period (Phase 6), the old `/digivolutions` page still works (before it's replaced with a redirect). This gives users a fallback link.

---

## 5. Recovery Strategy

### R1. "Glass-Break" Recovery Procedures

| Situation | Action | Time |
|-----------|--------|------|
| Graph shows wrong data | Flush CMS cache: restart CMS → `pm2 restart dmo-kb-cms` | 30s |
| All graphs fail to load | Check CMS logs for crash. If OOM: increase `max_memory_restart` or reduce `MAX_NODES` | 2 min |
| Feature flag rollback | Set `NEXT_PUBLIC_USE_NEW_EVOLUTION=false`, rebuild web, restart | 3 min |
| Edge data corrupted | Drop all edges: `mongosh --eval 'db["evolution-edges"].deleteMany({})'` + re-run migration | 10 min |
| MongoDB index conflict | Drop index: `db["evolution-edges"].dropIndex("ux_source_target_type")` + fix data + re-create | 5 min |
| Redis crash | System continues without Redis (graceful fallback in `getRedis()`). Fix Redis separately. | 0 (auto) |
| CMS restart loop | `pm2 stop dmo-kb-cms` → check logs → fix → `pm2 start dmo-kb-cms` | 5 min |
| Full DB restore needed | `mongorestore --db dmo-kb-prod --drop /root/backups/pre-migration-YYYYMMDD/dmo-kb-prod/` | 10 min |

### R2. Partial Graph Corruption Recovery

If specific edges are wrong but the system is otherwise healthy:

```bash
# Find and fix specific edges in CMS admin UI:
# https://cms.dmokb.info/admin/collections/evolution-edges?where[source][equals]=<digimonId>

# Or via mongosh:
mongosh dmo-kb-prod --eval '
  // Delete edges for a specific Digimon and re-migrate just that one
  db["evolution-edges"].deleteMany({ 
    $or: [
      { source: ObjectId("THE_ID") }, 
      { target: ObjectId("THE_ID") }
    ]
  })
'
# Then manually create correct edges via CMS admin
```

### R3. React Flow Crash Recovery

If React Flow throws an unrecoverable error (e.g., WebGL context lost on old devices):

```tsx
// Wrap EvolutionGraph in an error boundary:
'use client';
import { Component, type ReactNode } from 'react';

class EvolutionGraphErrorBoundary extends Component<
  { children: ReactNode; slug: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('EvolutionGraph crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border border-orange-500/30 rounded-lg text-center">
          <p className="text-muted-foreground">Evolution graph failed to load.</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-2 text-sm text-orange-400 underline">
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

This MUST be implemented. An unhandled React Flow crash will white-screen the entire Digimon profile page.

---

## 6. Go-Live Readiness Checklist

### Infrastructure

- [ ] MongoDB backup taken within last 24 hours
- [ ] `evolution-edges` collection exists with documents
- [ ] Compound unique index `ux_source_target_type` exists and is valid
- [ ] `evolution-graph-layouts` collection exists
- [ ] CMS process stable (0 restarts in last 1 hour)
- [ ] VPS memory usage < 70%
- [ ] Redis responding to PING

### Data Quality

- [ ] `db["evolution-edges"].countDocuments()` returns expected count
- [ ] `db["evolution-edges"].find({ $expr: { $eq: ["$source", "$target"] } }).count()` = 0
- [ ] Migration validation script run, <5% edges missing metadata
- [ ] Spot-check 10 popular Digimon: graph matches known evolution paths
- [ ] No edges with `source` or `target` pointing to nonexistent Digimon IDs

### API Health

- [ ] `GET /api/evolution-graph?digimon=agumon-classic&depth=5` → 200 in < 500ms
- [ ] `GET /api/evolution-graph?digimon=agumon-classic&depth=10` → 200 in < 2s
- [ ] `GET /api/evolution-graph?digimon=nonexistent` → 404
- [ ] `GET /api/evolution-graph` (no params) → 400
- [ ] `GET /api/evolution-graph?digimon=agumon-classic&depth=9999` → clamped to 10
- [ ] Cache-Control header present
- [ ] Old API still works: `GET /api/digimon/agumon-classic/digivolution-tree` → 200
- [ ] Request coalescing verified (two simultaneous curl requests → only 1 BFS)

### Frontend

- [ ] Graph renders on Chrome desktop
- [ ] Graph renders on Firefox desktop
- [ ] Graph renders on Safari desktop
- [ ] Graph renders on iOS Safari (test touch scrolling past graph)
- [ ] Graph renders on Android Chrome
- [ ] Node click navigates correctly
- [ ] Empty evolution data shows fallback (not blank/error)
- [ ] No horizontal page scrollbar on any Digimon page
- [ ] No React hydration warnings in browser console
- [ ] Error boundary catches React Flow crash gracefully
- [ ] After 20 consecutive page navigations: browser memory < 300MB
- [ ] Loading spinner appears during fetch
- [ ] Legend renders correctly with all 8 evolution types

### Editor

- [ ] Editor visible for admin/owner/editor roles
- [ ] Editor hidden for regular users and anonymous
- [ ] Drag-to-connect creates edge with modal
- [ ] Save persists to server (verify in MongoDB)
- [ ] Auto-layout produces readable result
- [ ] Delete key removes selected edge

### Security

- [ ] `conditions` field has size + depth validation
- [ ] Batch create endpoint rejects > 100 edges
- [ ] Batch delete requires admin role (not just editor)
- [ ] Self-loop prevention works (try creating A→A via API)
- [ ] Unauthenticated POST to `/api/evolution-edges/batch` → 403

### Rollback Readiness

- [ ] Feature flag switch tested: set false → rebuild → restart → old system works
- [ ] MongoDB backup path documented and accessible on VPS
- [ ] `mongorestore` command tested on non-production data

---

## 7. Hard "NO-GO" Conditions

**Rollout MUST be stopped immediately if any of these are true:**

### Data NO-GOs

1. **More than 10% of evolution edges have null metadata** where the old system had level/item requirements. Indicates migration data loss.

2. **Any self-loop edges exist** in the `evolution-edges` collection. Indicates broken validation. Could cause infinite loops in future code.

3. **Compound unique index does not exist** or is in `building` state. Without it, duplicate edges will accumulate and corrupt the graph.

4. **Edge count is < 50% of expected**. The sum of all `digivolvesTo` array lengths across all Digimon should approximate the edge count. If significantly lower, migration failed silently.

### Infrastructure NO-GOs

5. **CMS restarts more than twice in 10 minutes** after enabling the evolution routes. Indicates memory leak or crash loop.

6. **API response time for `GET /api/evolution-graph?digimon=agumon-classic&depth=5` exceeds 5 seconds** consistently (3 consecutive requests). The graph is too expensive to serve under load.

7. **VPS available memory drops below 500MB** during graph API testing. Indicates the BFS + node fetch is consuming too much memory. `MAX_NODES` or `depth` limit must be reduced.

### Frontend NO-GOs

8. **React Flow throws an unhandled exception on mount** for any Digimon with evolution data. If the graph component crashes, it takes down the entire Digimon profile page (no error boundary = white screen).

9. **Horizontal scrollbar appears on the Digimon profile page** when the graph is rendered. The containment CSS (`contain: layout style paint`) is not working, repeating the exact bug this redesign was meant to fix.

10. **iOS Safari cannot scroll past the graph section**. The graph "captures" touch events, making the page unusable on mobile. This is a shipping blocker for a mobile-visited site.

### Operational NO-GOs

11. **The feature flag rollback (set false → rebuild → restart) takes more than 5 minutes**. If we can't roll back quickly, we can't ship safely.

12. **The old `/api/digimon/:slug/digivolution-tree` endpoint stops working** after deploying the new code. The old system must remain functional as a fallback.

---

## Appendix A: Pre-Launch Stress Test Commands

Run these on the VPS before flipping the flag:

```bash
# ── A1. Single request baseline ──────────────────────────────
time curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5" | jq '.nodes | length'
# Expected: < 500ms, reasonable node count

# ── A2. Deep traversal stress ────────────────────────────────
time curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=10" | jq '.nodes | length'
# Expected: < 3s, capped at MAX_NODES

# ── A3. Concurrent request storm (simulates cache stampede) ──
for i in $(seq 1 20); do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
    "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5" &
done
wait
# Expected: All 200, most < 1s (coalescing/cache), none > 5s

# ── A4. Edge case: nonexistent Digimon ───────────────────────
curl -s "https://cms.dmokb.info/api/evolution-graph?digimon=doesnotexist" | jq '.error'
# Expected: "Digimon \"doesnotexist\" not found"

# ── A5. Edge case: missing param ─────────────────────────────
curl -s "https://cms.dmokb.info/api/evolution-graph" | jq '.error'
# Expected: "Missing ?digimon= parameter"

# ── A6. Memory check after 50 requests ───────────────────────
for i in $(seq 1 50); do
  curl -s -o /dev/null "https://cms.dmokb.info/api/evolution-graph?digimon=agumon-classic&depth=5"
done
curl -s "https://cms.dmokb.info/api/internal/metrics" | jq '.system.processMemMB'
# Expected: < 500MB. If > 800MB, investigate leak.

# ── A7. Verify old API unaffected ────────────────────────────
time curl -s "https://cms.dmokb.info/api/digimon/agumon-classic/digivolution-tree" | jq '.nodes | length'
# Expected: 200, same result as before deployment

# ── A8. Self-loop rejection test ─────────────────────────────
# Get any Digimon ID first:
DIGIMON_ID=$(curl -s "https://cms.dmokb.info/api/digimon?limit=1" | jq -r '.docs[0].id')
curl -s -X POST "https://cms.dmokb.info/api/evolution-edges/batch" \
  -H "Content-Type: application/json" \
  -d "{\"edges\": [{\"source\": \"$DIGIMON_ID\", \"target\": \"$DIGIMON_ID\", \"evolutionType\": \"normal\"}]}"
# Expected: error about self-loop
```

## Appendix B: Hardening Items to Implement Before Go-Live

| Priority | Item | Effort | Blocks Go-Live? |
|----------|------|--------|-----------------|
| **P0** | Error boundary around `<EvolutionGraph>` | 30 min | YES |
| **P0** | Request coalescing in evolution controller | 30 min | YES |
| **P0** | `conditions` field validation (size + depth + prototype) | 15 min | YES |
| **P0** | Create indexes BEFORE migration (not after) | 5 min (order change) | YES |
| **P1** | Per-endpoint rate limit on `/api/evolution-graph` | 20 min | NO (nice to have) |
| **P1** | Batch node fetch with `depth: 0` instead of `depth: 1` | 15 min | NO (perf improvement) |
| **P1** | Edge count hard cap (`MAX_EDGES = 2000`) | 5 min | NO |
| **P1** | Layout optimistic locking (409 on conflict) | 30 min | NO |
| **P1** | Mobile `touch-action` CSS fix | 10 min | NO (test first) |
| **P2** | API response timeout (5s abort) | 15 min | NO |
| **P2** | Migration metadata validation script | 30 min | NO |
| **P2** | Graceful degradation fallback link on graph error | 10 min | NO |

**4 items are P0 blockers. Total effort: ~1.5 hours. Implement before flipping the flag.**
