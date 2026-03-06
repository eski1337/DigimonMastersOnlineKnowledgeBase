import { NextRequest } from 'next/server';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

/* ── Rate limiter (in-memory, per-IP) ────────────────────────────────── */
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX = 3; // max registrations per window per IP
const ipAttempts = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up expired entries to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of ipAttempts) {
      if (now > entry.resetAt) ipAttempts.delete(key);
    }
  }, 5 * 60 * 1000); // every 5 minutes
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_MAX;
}

/* ── Disposable / throwaway email domain blocklist ───────────────────── */
const DISPOSABLE_DOMAINS = new Set([
  'fxavaj.com', 'mailinator.com', 'guerrillamail.com', 'tempmail.com',
  'throwaway.email', 'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com',
  'grr.la', 'dispostable.com', 'maildrop.cc', 'fakeinbox.com', 'tempail.com',
  'temp-mail.org', 'trashmail.com', 'trashmail.me', 'trashmail.net',
  'getnada.com', 'mohmal.com', 'harakirimail.com', 'burnermail.io',
  'mailnesia.com', 'tempr.email', 'discard.email', '10minutemail.com',
  'minutemail.com', 'emailondeck.com', 'crazymailing.com', 'mytemp.email',
  'tmpmail.net', 'tmpmail.org', 'bupmail.com', 'mailcatch.com',
  'inboxbear.com', 'mailsac.com', 'jetable.org', 'moakt.com',
]);

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return true;
  if (DISPOSABLE_DOMAINS.has(domain)) return true;
  // Block domains with random-looking names (5+ consecutive consonants or very short TLD-only domains)
  if (/^[b-df-hj-np-tv-z]{5,}/.test(domain.split('.')[0])) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return Response.json(
        { message: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password || !body.username) {
      return Response.json(
        { message: 'Email, username, and password are required' },
        { status: 400 }
      );
    }

    // Block disposable emails
    if (isDisposableEmail(body.email)) {
      return Response.json(
        { message: 'Disposable email addresses are not allowed. Please use a real email.' },
        { status: 400 }
      );
    }

    // Validate email format more strictly
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(body.email)) {
      return Response.json(
        { message: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const payload = {
      username: body.username,
      email: body.email,
      password: body.password,
      passwordConfirm: body.confirmPassword || body.password,
      name: body.name || body.username,
    };

    // Proxy registration to Payload CMS (server-to-server, no CORS needed)
    const response = await fetch(`${CMS_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Registration-Secret': process.env.REGISTRATION_SECRET || '',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('CMS returned non-JSON:', response.status, responseText.substring(0, 200));
      return Response.json(
        { message: 'Registration service error. Please try again.' },
        { status: 502 }
      );
    }

    if (!response.ok) {
      // Extract the actual error messages from Payload CMS response
      const errors = data.errors;
      if (errors && Array.isArray(errors)) {
        // Payload nests detailed messages in errors[].data[].message
        const messages: string[] = [];
        for (const err of errors) {
          if (err.data && Array.isArray(err.data)) {
            for (const d of err.data) {
              if (d.message) messages.push(d.message);
            }
          } else if (err.message) {
            messages.push(err.message);
          }
        }
        const msg = messages.length > 0 ? messages.join('. ') : (data.message || 'Registration failed');
        return Response.json({ message: msg, errors }, { status: response.status });
      }
      return Response.json(data, { status: response.status });
    }

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('Registration proxy error:', error);
    return Response.json(
      { message: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
