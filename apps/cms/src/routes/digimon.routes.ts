/**
 * Digimon Routes — digivolution tree, bulk operations, one-off fixes.
 * No business logic — routes only wire HTTP → controller.
 */
import { Router } from 'express';
import { requireEditorAuth } from '../middleware/auth';
import { createDigimonController } from '../controllers/digimon.controller';
import type { Payload } from 'payload';

export function createDigimonRoutes(payload: Payload): Router {
  const router = Router();
  const ctrl = createDigimonController(payload);

  // Digivolution tree
  router.get('/api/digimon/:slug/digivolution-tree', (req, res) => ctrl.getDigivolutionTree(req, res));

  // Bulk operations
  router.post('/api/publish-all-digimon', (req, res) => ctrl.publishAllDigimon(req, res));

  // One-off fixes (all require editor auth)
  router.post('/api/fix-goddramon-image', (req, res) => ctrl.fixGoddramonImage(req, res));
  router.post('/api/cleanup-alphamon', (req, res) => ctrl.cleanupAlphamon(req, res));
  router.post('/api/fix-sovereign-digimon', (req, res) => ctrl.fixSovereignDigimon(req, res));
  router.post('/api/unpublish-ruler-digimon', (req, res) => ctrl.unpublishRulerDigimon(req, res));
  router.post('/api/cleanup-digimon-variants', (req, res) => ctrl.cleanupDigimonVariants(req, res));
  router.post('/api/fix-duplicate-digimon', (req, res) => ctrl.fixDuplicateDigimon(req, res));

  return router;
}
