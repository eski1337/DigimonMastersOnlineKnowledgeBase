# Part 3 — API Routes & BFS Controller

## 3.1 Route Registration

```ts
// apps/cms/src/routes/evolution.routes.ts
import { Router } from 'express';
import { createEvolutionController } from '../controllers/evolution.controller';
import type { Payload } from 'payload';

export function createEvolutionRoutes(payload: Payload): Router {
  const router = Router();
  const ctrl = createEvolutionController(payload);

  // Public: graph traversal
  router.get('/api/evolution-graph', (req, res) => ctrl.getEvolutionGraph(req, res));

  // Editor: batch CRUD edges
  router.post('/api/evolution-edges/batch', (req, res) => ctrl.batchCreateEdges(req, res));
  router.delete('/api/evolution-edges/batch', (req, res) => ctrl.batchDeleteEdges(req, res));

  // Editor: save layout
  router.put('/api/evolution-graph-layouts/save', (req, res) => ctrl.saveLayout(req, res));

  return router;
}
```

Register in `app.ts` → `registerPostInitRoutes()`:

```ts
const { createEvolutionRoutes } = require('./routes/evolution.routes');
app.use(createEvolutionRoutes(payload));
```

## 3.2 Controller Implementation

```ts
// apps/cms/src/controllers/evolution.controller.ts
import type { Request, Response } from 'express';
import type { Payload } from 'payload';
import { createLogger } from '../services/logger';

const log = createLogger('evolution-controller');

// ── Types ────────────────────────────────────────────────────
interface GraphNode {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  form: string | null;
}
interface GraphEdge {
  id: string;
  source: string;
  target: string;
  evolutionType: string;
  requiredLevel: number | null;
  requiredItem: string | null;
  requiredItemQuantity: number | null;
  jogressPartner: string | null;
  conditions: any | null;
}
interface GraphResponse {
  success: boolean;
  targetDigimon: { id: string; slug: string; name: string };
  nodes: GraphNode[];
  edges: GraphEdge[];
  layout: {
    positions: Record<string, { x: number; y: number }>;
    viewport: { x: number; y: number; zoom: number } | null;
  } | null;
}

const MAX_DEPTH = 10;
const DEFAULT_DEPTH = 5;
const MAX_NODES = 500;

export function createEvolutionController(payload: Payload) {
  function resolveId(ref: any): string {
    if (typeof ref === 'string') return ref;
    if (ref?.id) return String(ref.id);
    if (ref?._id) return String(ref._id);
    return String(ref);
  }

  function getIconUrl(doc: any): string | null {
    if (!doc.icon) return null;
    if (typeof doc.icon === 'object' && doc.icon.url) return doc.icon.url;
    if (typeof doc.icon === 'string') return doc.icon;
    return null;
  }

  /**
   * BFS graph traversal.
   *
   * Instead of querying per-node (N+1), we batch all frontier node IDs
   * into a single $in query per BFS level → O(depth) queries total.
   */
  async function bfsTraverse(
    rootId: string,
    depth: number,
    direction: 'both' | 'up' | 'down',
  ): Promise<{ nodeIds: Set<string>; edges: any[] }> {
    const visited = new Set<string>();
    const allEdges: any[] = [];
    const edgeIdSet = new Set<string>();

    let frontier = new Set<string>([rootId]);
    visited.add(rootId);

    for (let d = 0; d < depth && frontier.size > 0; d++) {
      if (visited.size >= MAX_NODES) break;

      const frontierArray = Array.from(frontier);
      const nextFrontier = new Set<string>();

      // Build where clause based on direction
      const whereClauses: any[] = [];
      if (direction === 'both' || direction === 'down') {
        whereClauses.push({ source: { in: frontierArray } });
      }
      if (direction === 'both' || direction === 'up') {
        whereClauses.push({ target: { in: frontierArray } });
      }

      const edgeResult = await payload.find({
        collection: 'evolution-edges',
        where: { or: whereClauses },
        limit: 500,
        depth: 0,
      });

      for (const edge of edgeResult.docs) {
        const edgeId = String(edge.id);
        if (edgeIdSet.has(edgeId)) continue;
        edgeIdSet.add(edgeId);
        allEdges.push(edge);

        const sourceId = resolveId(edge.source);
        const targetId = resolveId(edge.target);

        if (!visited.has(sourceId) && visited.size < MAX_NODES) {
          visited.add(sourceId);
          nextFrontier.add(sourceId);
        }
        if (!visited.has(targetId) && visited.size < MAX_NODES) {
          visited.add(targetId);
          nextFrontier.add(targetId);
        }
      }

      frontier = nextFrontier;
    }

    return { nodeIds: visited, edges: allEdges };
  }

  return {
    /**
     * GET /api/evolution-graph?digimon={slug}&depth=5&direction=both
     */
    async getEvolutionGraph(req: Request, res: Response): Promise<void> {
      try {
        const slug = req.query.digimon as string;
        if (!slug) {
          res.status(400).json({ success: false, error: 'Missing ?digimon= parameter' });
          return;
        }

        const depth = Math.min(
          Math.max(1, parseInt(req.query.depth as string) || DEFAULT_DEPTH),
          MAX_DEPTH,
        );
        const direction = (['both', 'up', 'down'].includes(req.query.direction as string)
          ? req.query.direction
          : 'both') as 'both' | 'up' | 'down';

        // 1. Resolve slug → ID
        const rootResult = await payload.find({
          collection: 'digimon',
          where: { slug: { equals: slug } },
          limit: 1,
          depth: 0,
        });
        const rootDoc = rootResult.docs[0] as any;
        if (!rootDoc) {
          res.status(404).json({ success: false, error: `Digimon "${slug}" not found` });
          return;
        }
        const rootId = String(rootDoc.id);

        // 2. BFS
        const { nodeIds, edges: rawEdges } = await bfsTraverse(rootId, depth, direction);

        // 3. Batch-fetch all Digimon nodes (single query)
        const nodeResult = await payload.find({
          collection: 'digimon',
          where: { id: { in: Array.from(nodeIds) } },
          limit: nodeIds.size,
          depth: 1, // populate icon
        });

        const nodes: GraphNode[] = nodeResult.docs.map((d: any) => ({
          id: String(d.id),
          slug: d.slug,
          name: d.name,
          icon: getIconUrl(d),
          form: d.form || null,
        }));

        const edges: GraphEdge[] = rawEdges.map((e: any) => ({
          id: String(e.id),
          source: resolveId(e.source),
          target: resolveId(e.target),
          evolutionType: e.evolutionType,
          requiredLevel: e.requiredLevel || null,
          requiredItem: e.requiredItem || null,
          requiredItemQuantity: e.requiredItemQuantity || null,
          jogressPartner: e.jogressPartner ? resolveId(e.jogressPartner) : null,
          conditions: e.conditions || null,
        }));

        // 4. Load default layout
        let layout: GraphResponse['layout'] = null;
        const layoutResult = await payload.find({
          collection: 'evolution-graph-layouts',
          where: {
            and: [
              { rootDigimon: { equals: rootId } },
              { isDefault: { equals: true } },
            ],
          },
          limit: 1,
          depth: 0,
        });
        if (layoutResult.docs[0]) {
          const l = layoutResult.docs[0] as any;
          layout = { positions: l.positions || {}, viewport: l.viewport || null };
        }

        // 5. Cache header
        res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

        res.json({
          success: true,
          targetDigimon: { id: rootId, slug: rootDoc.slug, name: rootDoc.name },
          nodes,
          edges,
          layout,
        } satisfies GraphResponse);
      } catch (error: any) {
        log.error({ error: error.message, stack: error.stack }, 'Error in getEvolutionGraph');
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    },

    /**
     * POST /api/evolution-edges/batch
     * Body: { edges: Array<{ source, target, evolutionType, ... }> }
     */
    async batchCreateEdges(req: Request, res: Response): Promise<void> {
      try {
        const user = (req as any).user;
        if (!user || !['editor', 'admin', 'owner'].includes(user.role)) {
          res.status(403).json({ success: false, error: 'Forbidden' });
          return;
        }

        const { edges } = req.body;
        if (!Array.isArray(edges) || edges.length === 0) {
          res.status(400).json({ success: false, error: 'edges[] required' });
          return;
        }
        if (edges.length > 100) {
          res.status(400).json({ success: false, error: 'Max 100 edges per batch' });
          return;
        }

        const created: string[] = [];
        const skipped: string[] = [];
        const errors: string[] = [];

        for (const edge of edges) {
          try {
            if (!edge.source || !edge.target) { errors.push('Missing source/target'); continue; }
            if (edge.source === edge.target) { errors.push(`Self-loop: ${edge.source}`); continue; }

            await payload.create({
              collection: 'evolution-edges',
              data: {
                source: edge.source,
                target: edge.target,
                evolutionType: edge.evolutionType || 'normal',
                requiredLevel: edge.requiredLevel || null,
                requiredItem: edge.requiredItem || null,
                requiredItemQuantity: edge.requiredItemQuantity || null,
                jogressPartner: edge.jogressPartner || null,
                conditions: edge.conditions || null,
                notes: edge.notes || null,
              },
            });
            created.push(`${edge.source} → ${edge.target}`);
          } catch (e: any) {
            if (e.message?.includes('Duplicate')) {
              skipped.push(`${edge.source} → ${edge.target}`);
            } else {
              errors.push(`${edge.source} → ${edge.target}: ${e.message}`);
            }
          }
        }

        res.json({ success: true, created: created.length, skipped: skipped.length, errors });
      } catch (error: any) {
        log.error({ error: error.message }, 'Error in batchCreateEdges');
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    },

    /**
     * DELETE /api/evolution-edges/batch
     * Body: { edgeIds: string[] }
     */
    async batchDeleteEdges(req: Request, res: Response): Promise<void> {
      try {
        const user = (req as any).user;
        if (!user || !['admin', 'owner'].includes(user.role)) {
          res.status(403).json({ success: false, error: 'Forbidden — admin required' });
          return;
        }

        const { edgeIds } = req.body;
        if (!Array.isArray(edgeIds) || edgeIds.length === 0) {
          res.status(400).json({ success: false, error: 'edgeIds[] required' });
          return;
        }

        let deleted = 0;
        for (const id of edgeIds) {
          try { await payload.delete({ collection: 'evolution-edges', id }); deleted++; }
          catch { /* skip missing */ }
        }

        res.json({ success: true, deleted });
      } catch (error: any) {
        log.error({ error: error.message }, 'Error in batchDeleteEdges');
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    },

    /**
     * PUT /api/evolution-graph-layouts/save
     * Body: { rootDigimon, name, positions, viewport?, isDefault? }
     * Upserts: if layout exists for rootDigimon+name, updates it.
     */
    async saveLayout(req: Request, res: Response): Promise<void> {
      try {
        const user = (req as any).user;
        if (!user || !['editor', 'admin', 'owner'].includes(user.role)) {
          res.status(403).json({ success: false, error: 'Forbidden' });
          return;
        }

        const { rootDigimon, name, positions, viewport, isDefault } = req.body;
        if (!rootDigimon || !name || !positions) {
          res.status(400).json({ success: false, error: 'rootDigimon, name, positions required' });
          return;
        }

        const existing = await payload.find({
          collection: 'evolution-graph-layouts',
          where: { and: [{ rootDigimon: { equals: rootDigimon } }, { name: { equals: name } }] },
          limit: 1, depth: 0,
        });

        let doc;
        if (existing.docs[0]) {
          doc = await payload.update({
            collection: 'evolution-graph-layouts',
            id: String(existing.docs[0].id),
            data: { positions, viewport: viewport || null, isDefault: isDefault ?? false },
          });
        } else {
          doc = await payload.create({
            collection: 'evolution-graph-layouts',
            data: { rootDigimon, name, positions, viewport: viewport || null, isDefault: isDefault ?? true },
          });
        }

        res.json({ success: true, id: doc.id });
      } catch (error: any) {
        log.error({ error: error.message }, 'Error in saveLayout');
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    },
  };
}
```

## 3.3 Query Complexity

```
GET /api/evolution-graph?digimon=agumon-classic&depth=5

  1. Find root Digimon by slug              → 1 query (indexed)
  2. BFS level 0: edges where src/tgt IN [] → 1 query
  3. BFS level 1                            → 1 query
  4. BFS level 2                            → 1 query
  5. BFS level 3                            → 1 query
  6. BFS level 4                            → 1 query
  7. Batch fetch all Digimon nodes          → 1 query (IN with all IDs)
  8. Fetch default layout                   → 1 query (indexed)

Total: 8 queries for depth=5.  O(depth + 3).
Current system: loads ALL Digimon (~1000+) in paginated loop = O(n/100) queries.
```
