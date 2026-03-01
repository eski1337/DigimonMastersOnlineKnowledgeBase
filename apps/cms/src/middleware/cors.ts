/**
 * CORS middleware — allows requests from the web app and dev proxies.
 */
import type { Request, Response, NextFunction } from 'express';

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const allowedOrigins = new Set(
    [
      process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
      'https://dmokb.info',
      'https://cms.dmokb.info',
    ].filter(Boolean),
  );

  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
}
