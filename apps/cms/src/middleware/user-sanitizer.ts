/**
 * User Sanitizer middleware — strips sensitive fields from /api/users
 * responses for unauthenticated requests.
 */
import type { Request, Response, NextFunction } from 'express';

export function userSanitizerMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== 'GET') { next(); return; }

  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    const authHeader = req.headers.authorization;
    const hasCookie = req.headers.cookie?.includes('payload-token');
    const isAuthenticated = !!(authHeader || hasCookie);

    if (!isAuthenticated && body) {
      const stripUser = (user: any) => {
        if (!user || typeof user !== 'object') return user;
        const { email, discordId, loginAttempts, lockUntil, ...safe } = user;
        return safe;
      };

      if (body.docs && Array.isArray(body.docs)) {
        body.docs = body.docs.map(stripUser);
      } else if (body.id) {
        body = stripUser(body);
      }
    }
    return originalJson(body);
  };
  next();
}
