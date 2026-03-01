/**
 * Patch Notes Scraper Routes — admin-only endpoints for triggering
 * and monitoring the automated patch notes scraper.
 */
import { Router } from 'express';
import { requireAdmin } from '../middleware/require-admin';
import { scrapeAndSync } from '../services/patchnotes-scraper.service';
import { createLogger } from '../services/logger';

const log = createLogger('patchnotes-routes');

let isRunning = false;

export function createPatchNotesScraperRoutes(): Router {
  const router = Router();

  // POST /api/internal/scrape-patchnotes — trigger manual scrape
  router.post('/api/internal/scrape-patchnotes', requireAdmin, async (req, res) => {
    if (isRunning) {
      res.status(409).json({ error: 'Scrape already in progress' });
      return;
    }

    const dryRun = req.query.dryRun === 'true';
    const maxPages = parseInt(req.query.maxPages as string) || 3;

    isRunning = true;
    try {
      log.info({ dryRun, maxPages }, 'Manual patch notes scrape triggered');
      const result = await scrapeAndSync({ dryRun, maxPages });
      res.json({ success: true, ...result });
    } catch (e: any) {
      log.error({ error: e.message }, 'Manual scrape failed');
      res.status(500).json({ error: e.message });
    } finally {
      isRunning = false;
    }
  });

  // GET /api/internal/scrape-patchnotes/status — check if scraper is running
  router.get('/api/internal/scrape-patchnotes/status', requireAdmin, (_req, res) => {
    res.json({ running: isRunning });
  });

  return router;
}
