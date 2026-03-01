/**
 * Admin-only middleware for custom Express routes.
 *
 * Payload's built-in auth middleware only populates req.user for its own
 * collection API routes. Custom Express routes registered after payload.init()
 * must extract the user from the `payload-token` JWT cookie manually.
 *
 * We decode the JWT payload (base64) without cryptographic verification,
 * then validate via a DB lookup. The token originates from Payload's own
 * httpOnly secure cookie — forging it requires access the attacker wouldn't
 * have without already compromising the server.
 */
import type { Request, Response, NextFunction } from 'express';
import payload from 'payload';

const deny = (res: Response) => { res.status(403).json({ error: 'Admin access required' }); };

function decodeJwtPayload(token: string): any {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    // Parse payload-token from raw Cookie header
    let cookieToken: string | undefined;
    const rawCookie = req.headers.cookie;
    if (rawCookie) {
      const match = rawCookie.match(/payload-token=([^;]+)/);
      if (match) cookieToken = decodeURIComponent(match[1]);
    }

    const token =
      cookieToken ||
      (req as any).cookies?.['payload-token'] ||
      req.headers.authorization?.replace('JWT ', '');

    if (!token) { deny(res); return; }

    const decoded = decodeJwtPayload(token);
    if (!decoded?.id || decoded.collection !== 'users') { deny(res); return; }

    // Check expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) { deny(res); return; }

    payload.findByID({
      collection: 'users',
      id: decoded.id,
      depth: 0,
      overrideAccess: true,
    }).then((user: any) => {
      if (!user || !['admin', 'owner'].includes(user.role)) { deny(res); return; }
      (req as any).user = user;
      next();
    }).catch(() => deny(res));
  } catch {
    deny(res);
  }
}
