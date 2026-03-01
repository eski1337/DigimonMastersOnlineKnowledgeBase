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

  // 2. Initialize Payload CMS
  await payload.init({
    secret: env.PAYLOAD_SECRET,
    express: app,
    onInit: () => {
      payload.logger.info(`Payload Admin URL: ${payload.getAdminURL()}`);
    },
  });

  // 3. Patch admin HTML responses to remove Payload's default header elements
  app.use('/admin', (req, res, next) => {
    if (req.method !== 'GET') { next(); return; }
    const origSend = res.send.bind(res);
    res.send = function patchedSend(body: any) {
      if (typeof body === 'string' && body.includes('</head>')) {
        body = body.replace('</head>', `<style>
          header .nav__toggle, header .hamburger { display: none !important; }
        </style></head>`);
      }
      return origSend(body);
    };
    next();
  });

  // 4. Register post-init routes (scraper, digimon, admin pages)
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
