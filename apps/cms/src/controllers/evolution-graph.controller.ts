/**
 * Evolution Graph Controller
 *
 * Serves the read-only evolution graph data for the React Flow viewer.
 * Uses the existing digivolution data from the Digimon collection (BFS),
 * and optionally merges saved layout from evolution-graph-layouts.
 *
 * GET /api/evolution-graph?digimon={slug}&depth={1-5}
 *
 * Response:
 * {
 *   nodes: [{ id, label, slug, icon, level }],
 *   edges: [{ id, source, target, evolutionType, requiredLevel, requiredItem }],
 *   layout?: { nodes: { [id]: { x, y } }, viewport?: { x, y, zoom } }
 * }
 */
import type { Request, Response } from 'express';
import { createLogger } from '../services/logger';
import type { Payload } from 'payload';

const log = createLogger('evolution-graph');

const MAX_DEPTH = 5;

export function createEvolutionGraphController(payload: Payload) {
  return {
    async getEvolutionGraph(req: Request, res: Response): Promise<void> {
      try {
        const slug = (req.query.digimon as string || '').trim();
        if (!slug) {
          res.status(400).json({ error: 'Missing ?digimon= query parameter' });
          return;
        }

        const depth = Math.min(Math.max(parseInt(req.query.depth as string) || MAX_DEPTH, 1), MAX_DEPTH);

        // ── Load all Digimon (cached per-request via Payload) ────────
        const allDigimon = await findAllDigimon(payload);

        // Build lookup indexes
        const bySlug = new Map<string, any>();
        const byName = new Map<string, any>();
        const reverseFrom = new Map<string, any[]>(); // name → Digimon that digivolvesFrom that name
        const reverseTo = new Map<string, any[]>();   // name → Digimon that digivolvesTo that name

        for (const d of allDigimon) {
          bySlug.set(d.slug, d);
          byName.set(d.name, d);
          for (const evo of (d.digivolutions?.digivolvesFrom || [])) {
            if (!evo.name) continue;
            if (!reverseFrom.has(evo.name)) reverseFrom.set(evo.name, []);
            reverseFrom.get(evo.name)!.push(d);
          }
          for (const evo of (d.digivolutions?.digivolvesTo || [])) {
            if (!evo.name) continue;
            if (!reverseTo.has(evo.name)) reverseTo.set(evo.name, []);
            reverseTo.get(evo.name)!.push(d);
          }
        }

        const target = bySlug.get(slug);
        if (!target) {
          res.status(404).json({ error: 'Digimon not found' });
          return;
        }

        // ── BFS / DFS to collect graph ───────────────────────────────
        const nodeMap = new Map<string, GraphNode>();
        const edgeMap = new Map<string, GraphEdge>();
        const visited = new Set<string>();
        let edgeCounter = 0;

        function getIcon(doc: any): string | undefined {
          if (doc.icon) {
            if (typeof doc.icon === 'object' && doc.icon.url) return doc.icon.url;
            if (typeof doc.icon === 'string') return doc.icon;
          }
          return undefined;
        }

        function addNode(doc: any) {
          if (!nodeMap.has(doc.slug)) {
            nodeMap.set(doc.slug, {
              id: doc.slug,
              label: doc.name,
              slug: doc.slug,
              icon: getIcon(doc),
              level: doc.form || undefined,
            });
          }
        }

        function addEdge(source: string, tgt: string, evolutionType: string, requiredLevel?: number | null, requiredItem?: string | null) {
          const key = `${source}->${tgt}`;
          if (!edgeMap.has(key)) {
            edgeCounter++;
            edgeMap.set(key, {
              id: `e${edgeCounter}`,
              source,
              target: tgt,
              evolutionType,
              requiredLevel: requiredLevel || null,
              requiredItem: requiredItem || null,
            });
          }
        }

        function detectEvolutionType(parentDoc: any, childDoc: any, evo: any): string {
          // Check jogress
          if (parentDoc?.digivolutions?.jogress?.length > 0) {
            const isJogress = parentDoc.digivolutions.jogress.some(
              (j: any) => j.resultName === childDoc.name || j.partnerName === childDoc.name,
            );
            if (isJogress) return 'jogress';
          }
          // Check child's name for X-Antibody pattern
          if (childDoc.name?.includes(' X') && !parentDoc.name?.includes(' X')) return 'x-antibody';
          // Check variant forms
          if (childDoc.form === 'Burst Mode') return 'mode-change';
          if (childDoc.form === 'Armor') return 'digi-egg';
          // Default
          return 'normal';
        }

        function buildTree(doc: any, currentDepth: number, direction: 'forward' | 'backward' | 'both') {
          if (currentDepth > depth || visited.has(doc.slug)) return;
          visited.add(doc.slug);
          addNode(doc);

          if (direction === 'forward' || direction === 'both') {
            for (const evo of (doc.digivolutions?.digivolvesTo || [])) {
              if (!evo.name) continue;
              const t = byName.get(evo.name);
              if (t) {
                addNode(t);
                const type = detectEvolutionType(doc, t, evo);
                addEdge(doc.slug, t.slug, type, evo.requiredLevel, evo.requiredItem);
                buildTree(t, currentDepth + 1, 'forward');
              }
            }
            // Also check reverse index (other Digimon that list this one as digivolvesFrom)
            for (const child of (reverseFrom.get(doc.name) || [])) {
              if (child.slug === doc.slug) continue;
              addNode(child);
              const parentEvo = doc.digivolutions?.digivolvesTo?.find((e: any) => e.name === child.name);
              const type = detectEvolutionType(doc, child, parentEvo);
              addEdge(doc.slug, child.slug, type, parentEvo?.requiredLevel, parentEvo?.requiredItem);
              buildTree(child, currentDepth + 1, 'forward');
            }
          }

          if (direction === 'backward' || direction === 'both') {
            for (const evo of (doc.digivolutions?.digivolvesFrom || [])) {
              if (!evo.name) continue;
              const s = byName.get(evo.name);
              if (s) {
                addNode(s);
                const srcEvo = s.digivolutions?.digivolvesTo?.find((e: any) => e.name === doc.name);
                const type = detectEvolutionType(s, doc, srcEvo);
                addEdge(s.slug, doc.slug, type, srcEvo?.requiredLevel, srcEvo?.requiredItem);
                buildTree(s, currentDepth + 1, 'backward');
              }
            }
            for (const parent of (reverseTo.get(doc.name) || [])) {
              if (parent.slug === doc.slug) continue;
              addNode(parent);
              const pEvo = parent.digivolutions?.digivolvesTo?.find((e: any) => e.name === doc.name);
              const type = detectEvolutionType(parent, doc, pEvo);
              addEdge(parent.slug, doc.slug, type, pEvo?.requiredLevel, pEvo?.requiredItem);
              buildTree(parent, currentDepth + 1, 'backward');
            }
          }
        }

        buildTree(target, 0, 'both');

        // ── Look up saved layout ─────────────────────────────────────
        let layout = null;
        try {
          const layoutResult = await payload.find({
            collection: 'evolution-graph-layouts',
            where: { rootDigimon: { equals: target.id } },
            limit: 1,
            depth: 0,
          });
          if (layoutResult.docs.length > 0) {
            const doc = layoutResult.docs[0] as any;
            layout = {
              nodes: doc.nodes || {},
              viewport: doc.viewport || undefined,
            };
          }
        } catch (err: any) {
          log.warn({ error: err.message }, 'Failed to fetch layout, falling back to auto-layout');
        }

        // ── Respond ──────────────────────────────────────────────────
        res.json({
          nodes: Array.from(nodeMap.values()),
          edges: Array.from(edgeMap.values()),
          layout,
        });
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

/** Paginate through all Digimon documents. */
async function findAllDigimon(payload: Payload): Promise<any[]> {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const batch = await payload.find({ collection: 'digimon', limit: 100, page, depth: 1 });
    all.push(...batch.docs);
    if (!batch.hasNextPage) break;
    page++;
  }
  return all;
}
