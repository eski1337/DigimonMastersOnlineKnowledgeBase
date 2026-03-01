/**
 * Admin Routes — login page, import pages, batch import page.
 * No business logic — just wires HTTP to templates/static files.
 */
import { Router } from 'express';
import path from 'path';
import { renderLoginPage } from '../templates/login';
import { renderBatchImportPage } from '../templates/batch-import';

export function createAdminRoutes(): Router {
  const router = Router();

  // Custom login page — registered BEFORE payload.init() so it takes precedence
  router.get('/admin/login', (_req, res) => {
    const serverURL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';
    res.send(renderLoginPage(serverURL));
  });

  return router;
}

/**
 * Post-init admin routes — registered AFTER payload.init().
 */
export function createPostInitAdminRoutes(): Router {
  const router = Router();

  // Import Digimon page (static HTML)
  router.get('/import-digimon', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'routes', 'import-digimon.html'));
  });

  // Redirect from admin to make it easier
  router.get('/admin/import', (_req, res) => {
    res.redirect('/import-digimon');
  });

  // Batch import page
  router.get('/batch-import', (_req, res) => {
    res.send(renderBatchImportPage());
  });

  return router;
}
