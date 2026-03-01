# Part 7 — Performance Strategy

## 7.1 Server-Side Caching (CMS)

In-memory LRU cache on the CMS Express server. No additional Redis dependency on the CMS side.

```ts
// apps/cms/src/services/evolution-cache.service.ts
import { createLogger } from './logger';

const log = createLogger('evolution-cache');

const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
const MAX_CACHE_SIZE = 200;

function cacheKey(slug: string, depth: number, direction: string): string {
  return `evo:${slug}:${depth}:${direction}`;
}

export function getCached(slug: string, depth: number, direction: string): any | null {
  const key = cacheKey(slug, depth, direction);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.data;
}

export function setCache(slug: string, depth: number, direction: string, data: any): void {
  const key = cacheKey(slug, depth, direction);
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

export function invalidateAll(): void {
  cache.clear();
  log.info('Evolution cache cleared');
}
```

### Integration in controller

```ts
// In evolution.controller.ts → getEvolutionGraph(), before BFS:
import { getCached, setCache, invalidateAll } from '../services/evolution-cache.service';

// Early return if cached
const cached = getCached(slug, depth, direction);
if (cached) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.setHeader('X-Cache', 'HIT');
  res.json(cached);
  return;
}

// ... BFS + node fetch ...

// Store in cache before responding
const response = { success: true, targetDigimon, nodes, edges, layout };
setCache(slug, depth, direction, response);
res.setHeader('X-Cache', 'MISS');
res.json(response);
```

### Cache invalidation triggers

```ts
// In EvolutionEdges collection hooks.afterChange:
async ({ req }) => {
  const { invalidateAll } = require('../services/evolution-cache.service');
  invalidateAll(); // Any edge change invalidates all graph caches
}

// Same for afterDelete
```

## 7.2 Web App Redis Caching (Optional Layer)

The web app already has `ioredis` configured at `apps/web/src/lib/redis.ts`.
Add an optional Redis cache layer for the Next.js frontend:

```ts
// apps/web/src/lib/evolution-cache.ts
import { getRedis } from './redis';

const REDIS_TTL = 300; // 5 min
const PREFIX = 'evo-graph:';

export async function getCachedGraph(slug: string, depth: number, direction: string): Promise<any | null> {
  const redis = await getRedis();
  if (!redis) return null;
  try {
    const data = await redis.get(`${PREFIX}${slug}:${depth}:${direction}`);
    return data ? JSON.parse(data) : null;
  } catch { return null; }
}

export async function setCachedGraph(slug: string, depth: number, direction: string, data: any): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    await redis.setex(`${PREFIX}${slug}:${depth}:${direction}`, REDIS_TTL, JSON.stringify(data));
  } catch { /* silent */ }
}

export async function invalidateGraphCache(): Promise<void> {
  const redis = await getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys(`${PREFIX}*`);
    if (keys.length > 0) await redis.del(...keys);
  } catch { /* silent */ }
}
```

## 7.3 HTTP Caching Headers

Already set in the controller:

```
Cache-Control: public, s-maxage=300, stale-while-revalidate=600
```

- CDN / reverse proxy caches for 5 min
- Stale responses served for up to 10 min while revalidation happens in background
- Browser does NOT cache (no `max-age`) — each request hits CDN

## 7.4 N+1 Query Prevention

The BFS traversal is designed to avoid N+1:

| Approach | Queries |
|----------|---------|
| **Current system** | Load ALL Digimon (~1000+) in paginated loop = ~10+ queries |
| **Naive per-node BFS** | 1 query per node = O(n) queries |
| **Batched BFS (implemented)** | 1 `$in` query per BFS level = O(depth) queries |
| **Final node fetch** | 1 `$in` query for all discovered node IDs |
| **Layout fetch** | 1 indexed query |

**Total for depth=5: 8 queries** (1 slug lookup + 5 BFS levels + 1 node batch + 1 layout).

The key optimization is the `$in` query per BFS level:

```ts
// Instead of:
for (const nodeId of frontier) {
  const edges = await payload.find({ where: { source: { equals: nodeId } } }); // N+1!
}

// We do:
const edges = await payload.find({
  where: { or: [
    { source: { in: Array.from(frontier) } },  // single query
    { target: { in: Array.from(frontier) } },
  ]},
});
```

## 7.5 Large Graph Handling (500+ Nodes)

### Hard limit

```ts
const MAX_NODES = 500;
```

BFS stops expanding when `visited.size >= MAX_NODES`. This prevents runaway queries on heavily connected graphs.

### React Flow optimizations

```tsx
<ReactFlow
  // Disable features that cause O(n) recalculations
  nodesDraggable={false}        // in view mode
  nodesConnectable={false}      // in view mode
  elementsSelectable={false}    // in view mode

  // Zoom limits
  minZoom={0.1}
  maxZoom={2}

  // Performance
  fitView                       // single layout pass on mount
  fitViewOptions={{ padding: 0.2, maxZoom: 1.5 }}

  // Hide attribution watermark (reduces DOM)
  proOptions={{ hideAttribution: true }}
/>
```

### Debounced auto-layout

```ts
// hooks/useAutoLayout.ts
import { useCallback, useRef } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { computeDagreLayout } from '../lib/layout';
import { NODE_WIDTH, NODE_HEIGHT } from '../lib/constants';

export function useAutoLayout(
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runAutoLayout = useCallback((nodes: Node[], edges: Edge[]) => {
    // Debounce: if called rapidly (e.g. during batch add), only execute once
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const result = computeDagreLayout(nodes, edges, NODE_WIDTH, NODE_HEIGHT);
      setNodes(result.nodes);
      setEdges(result.edges);
      timerRef.current = null;
    }, 150); // 150ms debounce
  }, [setNodes, setEdges]);

  return { runAutoLayout };
}
```

### Virtualization

React Flow v12 (`@xyflow/react`) includes built-in viewport-based rendering. Nodes outside the visible viewport are not rendered to the DOM. This is automatic — no additional configuration needed. For graphs with 500+ nodes, this reduces the DOM element count from O(n) to O(visible).

## 7.6 Graph Persistence Hook

```ts
// hooks/useGraphPersistence.ts
'use client';
import { useState, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

export function useGraphPersistence(rootDigimonId: string) {
  const [saving, setSaving] = useState(false);

  const saveAll = useCallback(async (
    nodes: Node[],
    edges: Edge[],
    positions: Record<string, { x: number; y: number }>,
    layoutName: string,
  ) => {
    setSaving(true);
    try {
      // 1. Save new edges (temp IDs start with 'temp-')
      const newEdges = edges.filter((e) => e.id.startsWith('temp-'));
      if (newEdges.length > 0) {
        await fetch(`${CMS_URL}/api/evolution-edges/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            edges: newEdges.map((e) => ({
              source: e.source,
              target: e.target,
              evolutionType: e.data?.evolutionType || 'normal',
              requiredLevel: e.data?.requiredLevel || null,
              requiredItem: e.data?.requiredItem || null,
              requiredItemQuantity: e.data?.requiredItemQuantity || null,
              jogressPartner: e.data?.jogressPartner || null,
              conditions: e.data?.conditions || null,
            })),
          }),
        });
      }

      // 2. Save layout
      await fetch(`${CMS_URL}/api/evolution-graph-layouts/save`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rootDigimon: rootDigimonId,
          name: layoutName,
          positions,
          isDefault: true,
        }),
      });
    } catch (err) {
      console.error('Failed to save graph:', err);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [rootDigimonId]);

  return { saveAll, saving };
}
```

## 7.7 Performance Budget

| Metric | Target | Mechanism |
|--------|--------|-----------|
| API response time (cached) | <10ms | In-memory cache |
| API response time (uncached, depth=5) | <200ms | Batched BFS, indexed queries |
| Time to interactive (graph render) | <500ms | React Flow viewport virtualization |
| Max DOM nodes in viewport | ~100 | React Flow auto-culling |
| Max graph size before cutoff | 500 nodes | `MAX_NODES` constant |
| Cache TTL | 5 min | Configurable via constant |
| Stale-while-revalidate | 10 min | HTTP header |
