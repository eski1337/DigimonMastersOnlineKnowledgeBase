/**
 * Evolution Graph Controller
 *
 * Serves the evolution graph data for the React Flow viewer on profile pages.
 * Uses the evolution-edges + evolution-lines collections (editor data).
 *
 * Strategy:
 * 1. Find the Digimon by slug
 * 2. Find which evolution-line(s) include this Digimon
 * 3. Load all evolution-edges whose source OR target is in that line
 * 4. Load saved layout from evolution-graph-layouts (by line's rootDigimon)
 * 5. Return nodes + edges + layout
 *
 * GET /api/evolution-graph?digimon={slug}
 */
import type { Request, Response } from 'express';
import { createLogger } from '../services/logger';
import type { Payload } from 'payload';

const log = createLogger('evolution-graph');

export function createEvolutionGraphController(payload: Payload) {
  return {
    async getEvolutionGraph(req: Request, res: Response): Promise<void> {
      try {
        const slug = (req.query.digimon as string || '').trim();
        if (!slug) {
          res.status(400).json({ error: 'Missing ?digimon= query parameter' });
          return;
        }

        // 1. Find the Digimon
        const digimonResult = await payload.find({
          collection: 'digimon',
          where: { slug: { equals: slug } },
          limit: 1,
          depth: 0,
        });
        const target = digimonResult.docs[0] as any;
        if (!target) {
          res.status(404).json({ error: 'Digimon not found' });
          return;
        }

        // 2. Find evolution-line(s) that include this Digimon
        const lineResult = await payload.find({
          collection: 'evolution-lines',
          where: { digimonInLine: { contains: target.id } },
          limit: 10,
          depth: 0,
        });

        if (lineResult.docs.length === 0) {
          // No line found — return empty graph
          res.json({ nodes: [], edges: [], layout: null });
          return;
        }

        // Use the first matching line (most common case)
        const line = lineResult.docs[0] as any;
        const digimonIds: string[] = (line.digimonInLine || []).map((ref: any) =>
          typeof ref === 'string' ? ref : ref?.id,
        ).filter(Boolean);

        // 3. Load all Digimon docs for the line (for node data)
        const digimonById = new Map<string, any>();
        for (let i = 0; i < digimonIds.length; i += 50) {
          const batch = digimonIds.slice(i, i + 50);
          const result = await payload.find({
            collection: 'digimon',
            where: { id: { in: batch } },
            limit: 50,
            depth: 1,
          });
          for (const d of result.docs) digimonById.set((d as any).id, d);
        }

        // 4. Load all evolution-edges for these Digimon
        const allEdges: any[] = [];
        const digimonIdSet = new Set(digimonIds);

        for (let i = 0; i < digimonIds.length; i += 50) {
          const batch = digimonIds.slice(i, i + 50);
          const result = await payload.find({
            collection: 'evolution-edges',
            where: { source: { in: batch } },
            limit: 200,
            depth: 0,
          });
          for (const e of result.docs) {
            const tgtId = typeof (e as any).target === 'string' ? (e as any).target : (e as any).target?.id;
            if (digimonIdSet.has(tgtId)) {
              allEdges.push(e);
            }
          }
        }

        // 5. Build nodes
        const nodes: GraphNode[] = [];
        for (const digId of digimonIds) {
          const doc = digimonById.get(digId);
          if (!doc) continue;
          nodes.push({
            id: doc.slug,
            label: doc.name,
            slug: doc.slug,
            icon: getIcon(doc),
            mainImage: getMainImage(doc),
            level: doc.form || undefined,
          });
        }

        // 6. Build edges (map Digimon IDs → slugs)
        const idToSlug = new Map<string, string>();
        for (const [id, doc] of digimonById) idToSlug.set(id, (doc as any).slug);

        const edges: GraphEdge[] = [];
        const seenEdges = new Set<string>();
        let edgeCounter = 0;

        for (const e of allEdges) {
          const srcId = typeof e.source === 'string' ? e.source : e.source?.id;
          const tgtId = typeof e.target === 'string' ? e.target : e.target?.id;
          const srcSlug = idToSlug.get(srcId);
          const tgtSlug = idToSlug.get(tgtId);
          if (!srcSlug || !tgtSlug) continue;

          const key = `${srcSlug}->${tgtSlug}`;
          if (seenEdges.has(key)) continue;
          seenEdges.add(key);
          edgeCounter++;

          edges.push({
            id: `e${edgeCounter}`,
            source: srcSlug,
            target: tgtSlug,
            evolutionType: e.evolutionType || 'normal',
            requiredLevel: e.requiredLevel || null,
            requiredItem: e.requiredItem || null,
          });
        }

        // 7. Load saved layout (by line's rootDigimon)
        let layout = null;
        const rootId = typeof line.rootDigimon === 'string' ? line.rootDigimon : line.rootDigimon?.id;
        if (rootId) {
          try {
            const layoutResult = await payload.find({
              collection: 'evolution-graph-layouts',
              where: { rootDigimon: { equals: rootId } },
              limit: 1,
              depth: 0,
            });
            if (layoutResult.docs.length > 0) {
              const layoutDoc = layoutResult.docs[0] as any;
              // The layout stores positions by Digimon ID; convert to slugs
              const nodePositions = layoutDoc.nodes || {};
              const slugPositions: Record<string, { x: number; y: number }> = {};
              for (const [id, pos] of Object.entries(nodePositions)) {
                if (id.startsWith('__')) continue; // skip metadata keys
                const s = idToSlug.get(id);
                if (s && pos && typeof (pos as any).x === 'number') {
                  slugPositions[s] = pos as { x: number; y: number };
                }
              }
              if (Object.keys(slugPositions).length > 0) {
                // Extract and convert edge handle mappings (keys are "srcId->tgtId", convert to slugs)
                const rawHandles = (nodePositions as any).__edgeHandles;
                let edgeHandles: Record<string, { sourceHandle?: string; targetHandle?: string }> | undefined;
                if (rawHandles && typeof rawHandles === 'object') {
                  edgeHandles = {};
                  for (const [key, handles] of Object.entries(rawHandles)) {
                    const [srcId, tgtId] = key.split('->');
                    if (srcId && tgtId) {
                      const srcSlug = idToSlug.get(srcId);
                      const tgtSlug = idToSlug.get(tgtId);
                      if (srcSlug && tgtSlug) {
                        edgeHandles[`${srcSlug}->${tgtSlug}`] = handles as any;
                      }
                    }
                  }
                }
                layout = { nodes: slugPositions, viewport: layoutDoc.viewport || undefined, edgeHandles };
              }
            }
          } catch (err: any) {
            log.warn({ error: err.message }, 'Failed to fetch layout');
          }
        }

        // 8. Respond
        res.json({ nodes, edges, layout, lineId: line.id });
      } catch (error: any) {
        log.error({ error: error.message, stack: error.stack }, 'Evolution graph error');
        res.status(500).json({ error: 'Failed to build evolution graph' });
      }
    },
  };
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

interface GraphNode {
  id: string;
  label: string;
  slug: string;
  icon?: string;
  mainImage?: string;
  level?: string;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  evolutionType: string;
  requiredLevel?: number | null;
  requiredItem?: string | null;
}

function getMainImage(doc: any): string | undefined {
  if (doc.mainImage) {
    const img = typeof doc.mainImage === 'object' ? doc.mainImage : null;
    if (img?.url) return img.url;
  }
  return undefined;
}

function getIcon(doc: any): string | undefined {
  if (doc.icon) {
    if (typeof doc.icon === 'object' && doc.icon.url) return doc.icon.url;
    if (typeof doc.icon === 'string') return doc.icon;
  }
  // Try mainImage thumbnail as fallback
  if (doc.mainImage) {
    const img = typeof doc.mainImage === 'object' ? doc.mainImage : null;
    if (img?.sizes?.thumbnail?.url) return img.sizes.thumbnail.url;
    if (img?.url) return img.url;
  }
  return undefined;
}
