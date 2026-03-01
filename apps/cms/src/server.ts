/**
 * CMS Server — Bootstrap only.
 *
 * This file is responsible for:
 *   1. Loading environment variables
 *   2. Creating the Express app
 *   3. Initializing Payload CMS
 *   4. Registering post-init routes
 *   5. Starting the HTTP server
 *   6. Graceful shutdown
 *
 * All business logic lives in:
 *   - services/    (scraper, parser, image, transform, wiki-fetcher)
 *   - controllers/ (scraper, digimon)
 *   - routes/      (admin, scraper, digimon)
 *   - middleware/   (cors, auth, user-sanitizer, error-handler)
 *   - repositories/ (digimon, media, user)
 *   - templates/    (login, batch-import)
 *   - types/        (scraper.types)
 *   - utils/        (helpers, env)
 */
import payload from 'payload';
import dotenv from 'dotenv';
import { env } from './utils/env';
import { logger } from './services/logger';
import { closeBrowser } from './services/wiki-fetcher';
import { createApp, registerPostInitRoutes } from './app';

dotenv.config({ path: '../../.env' });

async function start(): Promise<void> {
  // 1. Create the Express app (pre-init middleware + routes)
  const app = createApp();

  // 2. Username-to-email login resolver (MUST be before payload.init)
  //    Intercepts POST /api/users/login, resolves username→email,
  //    then passes through to Payload's own login handler.
  //
  //    This middleware is REGISTERED before payload.init() (so it runs first
  //    in the Express middleware chain), but EXECUTES only at request time
  //    (after init has completed), so `payload` is fully initialized.
  //
  //    Uses payload.find() instead of raw mongoose — avoids pnpm hoisting
  //    issues where require('mongoose') fails in strict node_modules.
  app.use('/api/users/login', async (req, res, next) => {
    if (req.method !== 'POST' || !req.body?.email) { next(); return; }
    const identifier = (req.body.email as string).trim();
    if (identifier.includes('@')) { next(); return; }
    if (identifier.length === 0 || identifier.length > 64) { next(); return; }
    try {
      const result = await payload.find({
        collection: 'users',
        where: {
          username: { equals: identifier.toLowerCase() },
        },
        limit: 1,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: false,
      });
      if (result.docs.length > 0 && result.docs[0].email) {
        logger.info({ username: identifier }, 'Resolved username to email for login');
        req.body.email = result.docs[0].email;
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'Username lookup failed, falling through');
    }
    next();
  });

  // 3. Initialize Payload CMS
  await payload.init({
    secret: env.PAYLOAD_SECRET,
    express: app,
    onInit: () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
  });

  // 3. Register post-init routes (scraper, digimon, admin pages)
  registerPostInitRoutes(app, payload);

  // 5. Start HTTP server
  const PORT = 3001;
  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'CMS Server started');
  });

  // 6. Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    await closeBrowser();
    server.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  logger.error({ error: err.message }, 'Failed to start CMS server');
  process.exit(1);
});
