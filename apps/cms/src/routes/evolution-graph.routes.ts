/**
 * Evolution Graph Routes — public read-only API for the new React Flow viewer.
 */
import { Router } from 'express';
import { createEvolutionGraphController } from '../controllers/evolution-graph.controller';
import type { Payload } from 'payload';

export function createEvolutionGraphRoutes(payload: Payload): Router {
  const router = Router();
  const ctrl = createEvolutionGraphController(payload);

  // GET /api/evolution-graph?digimon=agumon&depth=5
  router.get('/api/evolution-graph', (req, res) => ctrl.getEvolutionGraph(req, res));

  return router;
}
