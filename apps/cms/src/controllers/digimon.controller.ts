/**
 * Digimon Controller — handles digivolution tree, bulk operations, and one-off fixes.
 * Routes → Controller → Services → Repositories
 */
import type { Request, Response } from 'express';
import { createLogger } from '../services/logger';
import { normalizeDigimonName } from '../utils/helpers';
import { DigimonRepository } from '../repositories/digimon.repository';
import type { Payload } from 'payload';
import type { TreeNode, TreeEdge } from '../types/scraper.types';

const log = createLogger('digimon-controller');

export function createDigimonController(payload: Payload) {
  const digimonRepo = new DigimonRepository(payload);

  return {
    /** GET /api/digimon/:slug/digivolution-tree */
    async getDigivolutionTree(req: Request, res: Response): Promise<void> {
      try {
        const { slug } = req.params;
        const maxDepth = parseInt(req.query.depth as string) || 5;

        const allDigimon = await digimonRepo.findAllPaginated(1);

        // Build in-memory indexes
        const bySlug = new Map<string, any>();
        const byName = new Map<string, any>();
        const reverseFrom = new Map<string, any[]>();
        const reverseTo = new Map<string, any[]>();

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

        const nodeMap = new Map<string, TreeNode>();
        const edgeSet = new Set<string>();
        const edges: TreeEdge[] = [];
        const visited = new Set<string>();

        const getIconUrl = (doc: any): string => {
          if (doc.icon) {
            if (typeof doc.icon === 'object' && doc.icon.url) return doc.icon.url;
            if (typeof doc.icon === 'string') return doc.icon;
          }
          return '/placeholder-icon.png';
        };

        const addNode = (doc: any) => {
          if (!nodeMap.has(doc.slug)) {
            nodeMap.set(doc.slug, { id: doc.slug, name: doc.name, icon: getIconUrl(doc), form: doc.form, slug: doc.slug });
          }
        };

        const addEdge = (source: string, tgt: string, level?: number, item?: string) => {
          const key = `${source}->${tgt}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            edges.push({ source, target: tgt, level: level || null, item: item || null });
          }
        };

        const buildTree = (doc: any, depth: number, direction: 'forward' | 'backward' | 'both') => {
          if (depth > maxDepth || visited.has(doc.slug)) return;
          visited.add(doc.slug);
          addNode(doc);

          if (direction === 'forward' || direction === 'both') {
            for (const evo of (doc.digivolutions?.digivolvesTo || [])) {
              if (!evo.name) continue;
              const t = byName.get(evo.name);
              if (t) { addEdge(doc.slug, t.slug, evo.requiredLevel, evo.requiredItem); buildTree(t, depth + 1, 'forward'); }
            }
            for (const child of (reverseFrom.get(doc.name) || [])) {
              if (child.slug === doc.slug) continue;
              const parentEvo = doc.digivolutions?.digivolvesTo?.find((e: any) => e.name === child.name);
              addEdge(doc.slug, child.slug, parentEvo?.requiredLevel, parentEvo?.requiredItem);
              buildTree(child, depth + 1, 'forward');
            }
          }

          if (direction === 'backward' || direction === 'both') {
            for (const evo of (doc.digivolutions?.digivolvesFrom || [])) {
              if (!evo.name) continue;
              const s = byName.get(evo.name);
              if (s) {
                const srcEvo = s.digivolutions?.digivolvesTo?.find((e: any) => e.name === doc.name);
                addEdge(s.slug, doc.slug, srcEvo?.requiredLevel, srcEvo?.requiredItem);
                buildTree(s, depth + 1, 'backward');
              }
            }
            for (const parent of (reverseTo.get(doc.name) || [])) {
              if (parent.slug === doc.slug) continue;
              const pEvo = parent.digivolutions?.digivolvesTo?.find((e: any) => e.name === doc.name);
              addEdge(parent.slug, doc.slug, pEvo?.requiredLevel, pEvo?.requiredItem);
              buildTree(parent, depth + 1, 'backward');
            }
          }
        };

        buildTree(target, 0, 'both');
        res.json({ success: true, targetDigimon: { slug: target.slug, name: target.name }, nodes: Array.from(nodeMap.values()), edges });
      } catch (error: any) {
        log.error({ error: error.message }, 'Error fetching digivolution tree');
        res.status(500).json({ error: error.message || 'Failed to fetch digivolution tree' });
      }
    },

    /** POST /api/fix-goddramon-image */
    async fixGoddramonImage(_req: Request, res: Response): Promise<void> {
      try {
        const result = await payload.find({ collection: 'digimon', where: { name: { equals: 'Goddramon' } }, limit: 1 });
        if (result.docs.length === 0) { res.status(404).json({ success: false, error: 'Goddramon not found' }); return; }
        await digimonRepo.update(String(result.docs[0].id), { icon: '' as any, mainImage: '' as any });
        res.json({ success: true, message: 'Goddramon images cleared' });
      } catch (error: any) {
        log.error({ error: error.message }, 'Error fixing Goddramon');
        res.status(500).json({ success: false, error: error.message });
      }
    },

    /** POST /api/cleanup-alphamon */
    async cleanupAlphamon(_req: Request, res: Response): Promise<void> {
      try {
        const deleted: string[] = []; const renamed: string[] = []; const errors: string[] = [];
        const all = await digimonRepo.findByNameContains('Alphamon');
        for (const digimon of all.docs) {
          const d = digimon as any;
          try {
            if (d.name === 'Alphamon (Mega)' || d.name === 'Alphamon Ouryuken (Jogress)') {
              await digimonRepo.delete(d.id); deleted.push(d.name); continue;
            }
            if (d.name === 'Alphamon (Mega X)') {
              await digimonRepo.update(d.id, { name: 'Alphamon X', slug: 'alphamon-x' }); renamed.push(`${d.name} → Alphamon X`); continue;
            }
            if (d.name === 'Alphamon Ouryuken (Jogress X)') {
              await digimonRepo.update(d.id, { name: 'Alphamon Ouryuken X', slug: 'alphamon-ouryuken-x' }); renamed.push(`${d.name} → Alphamon Ouryuken X`); continue;
            }
          } catch (err: any) { errors.push(`${d.name}: ${err.message}`); }
        }
        res.json({ success: true, deleted: deleted.length, deletedList: deleted, renamed: renamed.length, renamedList: renamed, errors: errors.length, errorList: errors });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },

    /** POST /api/fix-sovereign-digimon */
    async fixSovereignDigimon(_req: Request, res: Response): Promise<void> {
      try {
        const deleted: string[] = []; const published: string[] = []; const errors: string[] = [];
        const all = await digimonRepo.findAll(1000);
        const sovereigns = ['Baihumon', 'Xuanwumon', 'Zhuqiaomon', 'Qinglongmon', 'Azulongmon'];
        for (const digimon of all.docs) {
          const d = digimon as any;
          try {
            if (d.name.includes('(The Ruler of the ')) {
              await digimonRepo.delete(d.id); deleted.push(d.name); continue;
            }
            const isSovereign = sovereigns.some((n) => d.name.includes(n));
            if (isSovereign && d._status !== 'published' && (d.name.includes('(Champion)') || d.name.includes('(Mega)'))) {
              await digimonRepo.update(d.id, { _status: 'published' }); published.push(d.name);
            }
          } catch (err: any) { errors.push(`${d.name}: ${err.message}`); }
        }
        res.json({ success: true, deleted: deleted.length, deletedList: deleted, published: published.length, publishedList: published, errors: errors.length, errorList: errors });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },

    /** POST /api/unpublish-ruler-digimon */
    async unpublishRulerDigimon(_req: Request, res: Response): Promise<void> {
      try {
        const unpublished: string[] = []; const errors: string[] = [];
        const all = await digimonRepo.findAll(1000);
        for (const digimon of all.docs) {
          const d = digimon as any;
          try {
            if (d.name.includes('(The Ruler of the ')) {
              await digimonRepo.update(d.id, { _status: 'draft' }); unpublished.push(d.name);
            }
          } catch (err: any) { errors.push(`${d.name}: ${err.message}`); }
        }
        res.json({ success: true, unpublished: unpublished.length, unpublishedList: unpublished, errors: errors.length, errorList: errors });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },

    /** POST /api/cleanup-digimon-variants */
    async cleanupDigimonVariants(_req: Request, res: Response): Promise<void> {
      try {
        const removed: string[] = []; const renamed: string[] = []; const errors: string[] = [];
        const all = await digimonRepo.findAll(1000);
        for (const digimon of all.docs) {
          const d = digimon as any;
          try {
            if (d.name.includes('(Raid)')) { await digimonRepo.delete(d.id); removed.push(d.name); continue; }
            if (d.name.includes('(X-Antibody System)')) {
              const newName = d.name.replace(' (X-Antibody System)', ' X');
              const newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
              await digimonRepo.update(d.id, { name: newName, slug: newSlug });
              renamed.push(`${d.name} → ${newName}`);
            }
          } catch (err: any) { errors.push(`${d.name}: ${err.message}`); }
        }
        res.json({ success: true, removed: removed.length, removedList: removed, renamed: renamed.length, renamedList: renamed, errors: errors.length, errorList: errors });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },

    /** POST /api/fix-duplicate-digimon */
    async fixDuplicateDigimon(_req: Request, res: Response): Promise<void> {
      try {
        const all = await digimonRepo.findAll(1000);
        const nameGroups = new Map<string, any[]>();
        for (const digimon of all.docs) {
          const d = digimon as any;
          const baseName = d.name
            .replace(/ \(Champion\)$/i, '').replace(/ \(Mega\)$/i, '')
            .replace(/ \(Ultimate\)$/i, '').replace(/ \(Raid\)$/i, '')
            .replace(/ \(The Ruler of the [^)]+\)$/i, '');
          if (!nameGroups.has(baseName)) nameGroups.set(baseName, []);
          nameGroups.get(baseName)!.push(d);
        }

        const duplicates = Array.from(nameGroups.entries())
          .filter(([_, ds]) => ds.length > 1)
          .map(([baseName, ds]) => ({ baseName, count: ds.length, digimons: ds.map((d: any) => ({ id: d.id, name: d.name, form: d.form, slug: d.slug })) }));

        const fixed: string[] = []; const errors: string[] = [];
        for (const dup of duplicates) {
          for (const d of dup.digimons) {
            try {
              if (/(Champion|Mega|Ultimate|Raid|The Ruler)\)/.test(d.name)) continue;
              const newName = `${dup.baseName} (${d.form})`;
              const newSlug = newName.toLowerCase().replace(/\s+/g, '-').replace(/[()]/g, '');
              if (newName !== d.name) {
                await digimonRepo.update(d.id, { name: newName, slug: newSlug });
                fixed.push(`${d.name} → ${newName}`);
              }
            } catch (err: any) { errors.push(`${d.name}: ${err.message}`); }
          }
        }

        res.json({ success: true, duplicatesFound: duplicates.length, fixed: fixed.length, fixedList: fixed, errors: errors.length, errorList: errors, duplicates });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },

    /** POST /api/publish-all-digimon */
    async publishAllDigimon(_req: Request, res: Response): Promise<void> {
      try {
        const unpublished = await digimonRepo.findUnpublished(1000);
        let publishedCount = 0; let failedCount = 0;
        const failures: string[] = [];
        for (const digimon of unpublished.docs) {
          try {
            await digimonRepo.update(String(digimon.id), { _status: 'published' });
            publishedCount++;
          } catch (err: any) {
            failedCount++;
            failures.push((digimon as any).name || 'Unknown');
          }
        }
        res.json({ success: true, published: publishedCount, failed: failedCount, failures, message: `Published ${publishedCount} Digimon successfully!` });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    },
  };
}
