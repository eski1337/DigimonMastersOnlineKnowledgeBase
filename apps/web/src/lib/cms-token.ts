/**
 * Cached CMS admin token
 *
 * Avoids logging into the CMS on every single API request.
 * Token is cached in memory and refreshed 5 minutes before expiry.
 */

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

const TOKEN_LIFETIME_MS = 60 * 60 * 1000; // 1 hour (Payload default is 2h)
const REFRESH_BUFFER_MS = 5 * 60 * 1000;  // refresh 5 min early

export async function getCmsToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - REFRESH_BUFFER_MS) {
    return cachedToken;
  }

  const email = process.env.CMS_ADMIN_EMAIL;
  const password = process.env.CMS_ADMIN_PASSWORD;
  if (!email || !password) return '';

  try {
    const res = await fetch(`${CMS_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      cachedToken = null;
      return '';
    }
    const data = await res.json();
    const token = data.token || '';
    cachedToken = token;
    tokenExpiresAt = now + TOKEN_LIFETIME_MS;
    return token;
  } catch {
    cachedToken = null;
    return '';
  }
}
