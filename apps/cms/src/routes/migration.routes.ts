/**
 * Temporary migration route — populates evolution-edges + evolution-lines
 * from existing Digimon digivolution data using overrideAccess.
 *
 * DELETE THIS FILE after migration is complete.
 *
 * POST /api/run-evolution-migration?secret=<PAYLOAD_SECRET>
 */
import { Router } from 'express';
import { createLogger } from '../services/logger';
import type { Payload } from 'payload';

const log = createLogger('evolution-migration');

export function createMigrationRoutes(payload: Payload): Router {
  const router = Router();

  router.post('/api/run-evolution-migration', async (req, res) => {
    try {
      // Simple secret check so it can't be triggered by anyone
      const secret = req.query.secret || req.body?.secret;
      if (secret !== process.env.PAYLOAD_SECRET) {
        res.status(403).json({ error: 'Invalid secret' });
        return;
      }

      log.info('Starting evolution migration...');

      // 1. Load all Digimon
      const allDigimon: any[] = [];
      let page = 1;
      while (true) {
        const batch = await payload.find({ collection: 'digimon', limit: 100, page, depth: 1, overrideAccess: true });
        allDigimon.push(...batch.docs);
        if (!batch.hasNextPage) break;
        page++;
      }
      log.info(`Loaded ${allDigimon.length} Digimon`);

      // 2. Build name→doc map
      const nameToDoc = new Map<string, any>();
      for (const d of allDigimon) nameToDoc.set(d.name, d);

      // 3. Load existing edges
      const existingEdgeKeys = new Set<string>();
      let ePage = 1;
      while (true) {
        const batch = await payload.find({ collection: 'evolution-edges', limit: 100, page: ePage, depth: 0, overrideAccess: true });
        for (const e of batch.docs) {
          const src = typeof (e as any).source === 'string' ? (e as any).source : (e as any).source?.id;
          const tgt = typeof (e as any).target === 'string' ? (e as any).target : (e as any).target?.id;
          if (src && tgt) existingEdgeKeys.add(`${src}->${tgt}`);
        }
        if (!batch.hasNextPage) break;
        ePage++;
      }
      log.info(`Existing edges: ${existingEdgeKeys.size}`);

      // 4. Create edges
      let edgesCreated = 0, edgesSkipped = 0, edgeErrors = 0;

      for (const digimon of allDigimon) {
        const digivolvesTo = (digimon as any).digivolutions?.digivolvesTo || [];
        for (const evo of digivolvesTo) {
          if (!evo.name) continue;
          const target = nameToDoc.get(evo.name);
          if (!target) continue;

          const key = `${digimon.id}->${target.id}`;
          if (existingEdgeKeys.has(key)) { edgesSkipped++; continue; }

          let evolutionType = 'normal';
          const jogress = (digimon as any).digivolutions?.jogress || [];
          if (jogress.length > 0) {
            const isJ = jogress.some((j: any) => j.resultName === evo.name || j.partnerName === evo.name);
            if (isJ) evolutionType = 'jogress';
          }
          if (evolutionType === 'normal') {
            if (target.name?.includes(' X') && !digimon.name?.includes(' X')) evolutionType = 'x-antibody';
            else if (target.form === 'Burst Mode') evolutionType = 'mode-change';
            else if (target.form === 'Armor') evolutionType = 'digi-egg';
          }

          let jogressPartner: string | undefined;
          if (evolutionType === 'jogress') {
            for (const j of jogress) {
              if (j.resultName === evo.name && j.partnerName) {
                const p = nameToDoc.get(j.partnerName);
                if (p) { jogressPartner = p.id; break; }
              }
            }
          }

          try {
            const data: any = {
              source: digimon.id,
              target: target.id,
              evolutionType,
            };
            if (evo.requiredLevel) data.requiredLevel = evo.requiredLevel;
            if (evo.requiredItem) data.requiredItem = evo.requiredItem;
            if (jogressPartner) data.jogressPartner = jogressPartner;

            await payload.create({ collection: 'evolution-edges', data, overrideAccess: true });
            existingEdgeKeys.add(key);
            edgesCreated++;
          } catch (err: any) {
            edgeErrors++;
            if (edgeErrors <= 5) log.error(`Edge error ${digimon.name} -> ${evo.name}: ${err.message}`);
          }
        }
      }

      // 5. Build evolution lines
      const existingLineNames = new Set<string>();
      let lPage = 1;
      while (true) {
        const batch = await payload.find({ collection: 'evolution-lines', limit: 100, page: lPage, depth: 0, overrideAccess: true });
        for (const l of batch.docs) existingLineNames.add((l as any).name);
        if (!batch.hasNextPage) break;
        lPage++;
      }

      const visited = new Set<string>();
      let linesCreated = 0, linesSkipped = 0;

      for (const d of allDigimon) {
        const hasFrom = ((d as any).digivolutions?.digivolvesFrom || []).length > 0;
        const hasTo = ((d as any).digivolutions?.digivolvesTo || []).length > 0;
        if (hasFrom || !hasTo || visited.has(d.slug)) continue;

        const chain: string[] = [];
        const queue = [d];
        const seen = new Set<string>();
        while (queue.length > 0) {
          const cur = queue.shift()!;
          if (seen.has(cur.slug)) continue;
          seen.add(cur.slug);
          visited.add(cur.slug);
          chain.push(cur.id as string);
          for (const evo of ((cur as any).digivolutions?.digivolvesTo || [])) {
            if (!evo.name) continue;
            const t = nameToDoc.get(evo.name);
            if (t && !seen.has(t.slug)) queue.push(t);
          }
        }

        if (chain.length < 2) continue;
        const lineName = `${d.name} Line`;
        if (existingLineNames.has(lineName)) { linesSkipped++; continue; }

        try {
          await payload.create({
            collection: 'evolution-lines',
            data: { name: lineName, rootDigimon: d.id, digimonInLine: chain, isPublic: true },
            overrideAccess: true,
          });
          linesCreated++;
        } catch (err: any) {
          log.error(`Line error ${lineName}: ${err.message}`);
        }
      }

      const result = {
        success: true,
        edges: { created: edgesCreated, skipped: edgesSkipped, errors: edgeErrors },
        lines: { created: linesCreated, skipped: linesSkipped },
      };
      log.info(result, 'Migration complete');
      res.json(result);
    } catch (err: any) {
      log.error({ error: err.message }, 'Migration failed');
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
