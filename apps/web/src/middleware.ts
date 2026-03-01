import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { checkRateLimit, getClientIdentifier } from '@/lib/rate-limiter';

const ALLOWED_ORIGINS = new Set(
  [
    process.env.NEXT_PUBLIC_APP_URL || 'https://dmokb.info',
    'https://dmokb.info',
    'https://cms.dmokb.info',
    'http://localhost:3000',
  ].filter(Boolean)
);

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Combined middleware: rate limiting + origin validation + auth
 */
export async function middleware(request: NextRequest) {
  // ── Origin validation for mutation requests ───────────────────
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    WRITE_METHODS.has(request.method)
  ) {
    const origin = request.headers.get('origin');
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return NextResponse.json(
        { error: 'Forbidden origin' },
        { status: 403 }
      );
    }
  }

  // ── Rate limiting for API routes ──────────────────────────────
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const clientId = getClientIdentifier(request);

    // Stricter limits for write operations
    const isWrite = WRITE_METHODS.has(request.method);
    const config = isWrite
      ? { maxRequests: 20, windowMs: 60_000 }   // 20/min for writes
      : { maxRequests: 100, windowMs: 60_000 };  // 100/min for reads

    const key = isWrite ? `${clientId}:write` : clientId;
    const rateLimitResult = await checkRateLimit(key, config);

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many requests', retryAfter },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.max(retryAfter, 1).toString(),
          },
        }
      );
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());

    return response;
  }

  // ── Auth protection for admin/account routes ──────────────────
  if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/account')) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const url = new URL('/auth/signin', request.url);
      url.searchParams.set('callbackUrl', encodeURI(request.url));
      return NextResponse.redirect(url);
    }

    if (request.nextUrl.pathname.startsWith('/admin')) {
      const roles = (token.roles as string[]) || [];
      if (!roles.includes('editor') && !roles.includes('admin') && !roles.includes('owner')) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*', '/account/:path*'],
};
