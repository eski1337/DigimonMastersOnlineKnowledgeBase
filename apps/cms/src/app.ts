/**
 * Express app configuration.
 * Sets up middleware, pre-init routes, and exports the app for server.ts.
 */
import express from 'express';
import path from 'path';
import { corsMiddleware } from './middleware/cors';
import { httpMetricsMiddleware } from './middleware/http-metrics';
import { userSanitizerMiddleware } from './middleware/user-sanitizer';
import { errorHandler } from './middleware/error-handler';
import { createAdminRoutes } from './routes/admin.routes';
import { logger } from './services/logger';

export function createApp(): express.Express {
  const app = express();

  // Body parser
  app.use(express.json({ limit: '10mb' }));

  // HTTP metrics tracking (must be early)
  app.use(httpMetricsMiddleware);

  // CORS
  app.use(corsMiddleware);

  // Pre-init routes (must be registered BEFORE payload.init)
  app.use(createAdminRoutes());

  // Security: strip sensitive user fields for unauthenticated requests
  app.use('/api/users', userSanitizerMiddleware);

  // Static images
  const imagesPath = path.resolve(__dirname, '..', '..', '..', 'Images');
  logger.info({ path: imagesPath }, 'Serving static images');
  app.use('/Images', express.static(imagesPath));

  return app;
}

/**
 * Register post-init routes and error handler.
 * Called AFTER payload.init() so Payload middleware is already in place.
 */
export function registerPostInitRoutes(
  app: express.Express,
  payload: import('payload').Payload,
): void {
  // Lazy imports to avoid circular dependencies
  const { createPostInitAdminRoutes } = require('./routes/admin.routes');
  const { createScraperRoutes } = require('./routes/scraper.routes');
  const { createDigimonRoutes } = require('./routes/digimon.routes');

  // NOTE: Username-to-email login resolver is in server.ts (pre-init)
  // because Payload's own login handler runs first and would consume
  // the request before any post-init middleware can modify req.body.

  // Post-init admin pages
  app.use(createPostInitAdminRoutes());

  // API routes
  app.use(createScraperRoutes(payload));
  app.use(createDigimonRoutes(payload));

  // Metrics routes (admin-only, after Payload auth middleware)
  const { createMetricsRoutes } = require('./routes/metrics.routes');
  const { startMetricsCollection } = require('./controllers/metrics.controller');
  const { setPayloadRef } = require('./services/metrics.service');
  setPayloadRef(payload); // Inject initialized Payload so Mongo health check works
  app.use(createMetricsRoutes());
  startMetricsCollection();

  // Admin backup routes (admin-only)
  const { createAdminBackupRoutes } = require('./routes/admin-backup.routes');
  app.use(createAdminBackupRoutes());

  // Patch notes scraper routes + auto-sync cron (admin-only)
  const { createPatchNotesScraperRoutes } = require('./routes/patchnotes-scraper.routes');
  const { startScrapeCron } = require('./services/patchnotes-scraper.service');
  app.use(createPatchNotesScraperRoutes());
  startScrapeCron();

  // Centralized error handler (must be last)
  app.use(errorHandler);
}
