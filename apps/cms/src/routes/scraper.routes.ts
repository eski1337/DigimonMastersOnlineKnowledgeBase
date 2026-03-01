/**
 * Scraper Routes — import, batch import, wiki warmup.
 * No business logic — routes only wire HTTP → controller.
 */
import { Router } from 'express';
import { requireEditorAuth } from '../middleware/auth';
import { warmupWiki, isWikiWarmedUp } from '../services/wiki-fetcher';
import { createScraperController } from '../controllers/scraper.controller';
import type { Payload } from 'payload';

export function createScraperRoutes(payload: Payload): Router {
  const router = Router();
  const ctrl = createScraperController(payload);

  // Wiki warmup (legacy — returns success immediately)
  router.post('/api/wiki-warmup', async (_req, res) => {
    try {
      const result = await warmupWiki();
      if (result.success) return res.json({ status: 'ok', message: result.message });
      return res.status(500).json({ error: 'Wiki warmup failed' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Wiki warmup failed' });
    }
  });

  router.get('/api/wiki-warmup', (_req, res) => {
    res.json({ warmedUp: isWikiWarmedUp() });
  });

  // Import endpoints
  router.post('/api/import-digimon', requireEditorAuth, (req, res) => ctrl.importDigimon(req, res));
  router.get('/api/import-digimon/popular', (req, res) => ctrl.getPopularDigimon(req, res));
  router.post('/api/import-digimon/save', requireEditorAuth, (req, res) => ctrl.saveDigimon(req, res));

  // Batch import
  router.get('/api/batch-import-progress', (req, res) => ctrl.getBatchProgress(req, res));
  router.post('/api/batch-import-digimon', requireEditorAuth, (req, res) => ctrl.batchImportDigimon(req, res));

  // Batch fix
  router.post('/api/batch-fix', requireEditorAuth, (req, res) => ctrl.batchFix(req, res));

  return router;
}
