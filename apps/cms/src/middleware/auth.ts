/**
 * Authentication middleware for CMS routes.
 */
import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../services/logger';
import { UserRepository } from '../repositories/user.repository';
import type { Payload } from 'payload';

const log = createLogger('auth');

/**
 * Require editor+ role for protected endpoints.
 */
export function requireEditorAuth(req: any, res: any, next: any): void {
  try {
    const token = req.headers.authorization?.replace('JWT ', '') || req.cookies?.['payload-token'];
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const role = req.user?.role;
    if (!role || !['editor', 'admin', 'owner'].includes(role)) {
      res.status(403).json({ error: 'Editor role or higher required' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Username-to-email login resolver middleware.
 * Allows CMS login with username OR email, normalises case.
 */
export function createLoginResolver(payload: Payload) {
  const userRepo = new UserRepository(payload);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'POST' || !req.body?.email) { next(); return; }

    try {
      const identifier = (req.body.email as string).trim();

      if (!identifier.includes('@')) {
        // Username login
        const exact = await userRepo.findByUsername(identifier);
        if (exact) {
          req.body.email = exact.email;
          log.info({ username: identifier }, 'Resolved username to email for login');
        } else {
          const fuzzy = await userRepo.findByUsernameFuzzy(identifier);
          if (fuzzy) {
            req.body.email = fuzzy.email;
            log.info({ username: identifier }, 'Resolved username to email (case-insensitive)');
          }
        }
      } else {
        // Email login — normalise to stored casing
        const byEmail = await userRepo.findByEmail(identifier);
        if (byEmail) {
          req.body.email = byEmail.email;
        } else {
          const fuzzyEmail = await userRepo.findByEmailFuzzy(identifier);
          if (fuzzyEmail) {
            req.body.email = fuzzyEmail.email;
            log.info({ input: identifier, resolved: fuzzyEmail.email }, 'Resolved email case for login');
          }
        }
      }
    } catch {
      // Fall through — Payload will return its own invalid-credentials error
    }
    next();
  };
}
