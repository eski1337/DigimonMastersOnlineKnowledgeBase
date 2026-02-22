/**
 * Wiki Fetcher — bypasses Cloudflare using multiple strategies:
 * 1. CF Proxy (Python service on port 8191) — most reliable, requires user to solve CAPTCHA once
 * 2. Wayback Machine (Internet Archive) — works for cached pages without any setup
 * 3. Direct fetch — fallback, usually blocked by Cloudflare
 */

const WIKI_BASE = 'https://dmowiki.com';
const WAYBACK_PREFIX = 'https://web.archive.org/web';
const CF_PROXY_URL = 'http://127.0.0.1:8191';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Check if the CF proxy is running and ready */
async function isCfProxyReady(): Promise<boolean> {
  try {
    const res = await fetch(CF_PROXY_URL, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json() as any;
      return data.status === 'ready';
    }
  } catch {}
  return false;
}

/**
 * Fetch a wiki page via the Wayback Machine (bypasses Cloudflare).
 * Falls back to a direct fetch if Wayback doesn't have the page.
 */
export async function fetchWikiPage(slug: string): Promise<{
  exists: boolean;
  html?: string;
  error?: string;
  source?: 'wayback' | 'direct' | 'pasted' | 'cf-proxy';
}> {
  const wikiUrl = `${WIKI_BASE}/${encodeURIComponent(slug)}`;

  // Strategy 0: CF Proxy (Python service) — most reliable when running
  const proxyReady = await isCfProxyReady();
  if (proxyReady) {
    try {
      console.log(`[wiki-fetcher] Trying CF proxy for: ${slug}`);
      const proxyUrl = `${CF_PROXY_URL}/fetch?url=${encodeURIComponent(wikiUrl)}`;
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(30000) });

      if (response.ok) {
        const html = await response.text();
        if (html.includes('This page does not exist') || html.includes('There is currently no text in this page')) {
          return { exists: false, error: `Wiki page not found: ${slug}` };
        }
        console.log(`[wiki-fetcher] ✅ Fetched via CF proxy (${html.length} chars)`);
        return { exists: true, html, source: 'cf-proxy' };
      }
      console.log(`[wiki-fetcher] CF proxy returned ${response.status}`);
    } catch (err: any) {
      console.log(`[wiki-fetcher] CF proxy failed: ${err.message}`);
    }
  }

  // Strategy 1a: Use Wayback Machine availability API to find the best snapshot URL
  let waybackSnapshotUrl: string | null = null;
  try {
    console.log(`[wiki-fetcher] Checking Wayback availability for: ${slug}`);
    const availabilityUrl = `https://archive.org/wayback/available?url=${encodeURIComponent(`dmowiki.com/${slug}`)}`;
    const availRes = await fetch(availabilityUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (availRes.ok) {
      const availData = await availRes.json() as any;
      const snapshot = availData?.archived_snapshots?.closest;
      if (snapshot?.available && snapshot?.url) {
        waybackSnapshotUrl = snapshot.url.replace(/^http:/, 'https:');
        console.log(`[wiki-fetcher] Found snapshot: ${snapshot.timestamp}`);
      } else {
        console.log(`[wiki-fetcher] No Wayback snapshot available for ${slug}`);
      }
    }
  } catch (err: any) {
    console.log(`[wiki-fetcher] Availability API failed: ${err.message}`);
  }

  // Strategy 1b: Fetch the actual snapshot (or try year-based URLs as fallback)
  const urlsToTry = waybackSnapshotUrl
    ? [waybackSnapshotUrl]
    : [`${WAYBACK_PREFIX}/2024/${wikiUrl}`, `${WAYBACK_PREFIX}/2023/${wikiUrl}`, `${WAYBACK_PREFIX}/2/${wikiUrl}`];
  
  for (const tryUrl of urlsToTry) {
    try {
      console.log(`[wiki-fetcher] Fetching: ${tryUrl.substring(0, 80)}...`);
      const response = await fetch(tryUrl, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(20000),
      });

      if (response.ok) {
        let html = await response.text();
        html = stripWaybackWrapper(html);

        if (
          html.includes('This page does not exist') ||
          html.includes('There is currently no text in this page')
        ) {
          return { exists: false, error: `Wiki page not found: ${slug}` };
        }

        console.log(`[wiki-fetcher] ✅ Fetched via Wayback Machine (${html.length} chars)`);
        return { exists: true, html, source: 'wayback' };
      }
      console.log(`[wiki-fetcher] Wayback returned ${response.status}`);
    } catch (err: any) {
      console.log(`[wiki-fetcher] Wayback fetch failed: ${err.message}`);
    }
  }

  // Strategy 2: Direct fetch (may fail due to Cloudflare)
  try {
    console.log(`[wiki-fetcher] Trying direct fetch: ${wikiUrl}`);
    const response = await fetch(wikiUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      redirect: 'follow',
    });

    if (response.ok) {
      const html = await response.text();

      // Detect Cloudflare challenge
      if (
        html.includes('Just a moment') ||
        html.includes('challenge-platform') ||
        html.includes('cf-challenge')
      ) {
        return {
          exists: false,
          error: `Cloudflare blocked direct access. The Wayback Machine also didn't have this page cached. Please use the "Paste HTML" tab instead.`,
        };
      }

      if (
        html.includes('This page does not exist') ||
        html.includes('There is currently no text in this page')
      ) {
        return { exists: false, error: `Wiki page not found: ${slug}` };
      }

      console.log(`[wiki-fetcher] ✅ Fetched directly (${html.length} chars)`);
      return { exists: true, html, source: 'direct' };
    }

    if (response.status === 403) {
      return {
        exists: false,
        error: `Cloudflare blocked direct access (403). The Wayback Machine also didn't have "${slug}" cached. Please use the "Paste HTML" tab to import manually.`,
      };
    }

    return { exists: false, error: `Wiki returned HTTP ${response.status}` };
  } catch (err: any) {
    return {
      exists: false,
      error: `Both Wayback Machine and direct fetch failed: ${err.message}. Please use the "Paste HTML" tab.`,
    };
  }
}

/**
 * Strip Wayback Machine injected toolbar, scripts, and rewrite URLs back to original.
 */
function stripWaybackWrapper(html: string): string {
  // Remove Wayback Machine toolbar
  html = html.replace(/<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/gi, '');
  
  // Remove Wayback Machine injected scripts and styles
  html = html.replace(/<script[^>]*src="[^"]*web\.archive\.org[^"]*"[^>]*><\/script>/gi, '');
  html = html.replace(/<link[^>]*href="[^"]*web\.archive\.org[^"]*"[^>]*\/?>/gi, '');
  html = html.replace(/<script[^>]*>[\s\S]*?__wm\.init\([\s\S]*?<\/script>/gi, '');
  html = html.replace(/<style[^>]*>[\s\S]*?\.wb-autocomplete[\s\S]*?<\/style>/gi, '');
  html = html.replace(/<div id="wm-ipp-base"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi, '');
  html = html.replace(/<div id="donato"[\s\S]*?<\/div>/gi, '');
  html = html.replace(/<div id="wm-ipp"[\s\S]*?<\/div>/gi, '');

  // Rewrite Wayback Machine archived URLs back to original dmowiki.com URLs
  // e.g., /web/20240815/https://dmowiki.com/images/... → /images/...
  html = html.replace(/https?:\/\/web\.archive\.org\/web\/\d+\w*\/(https?:\/\/dmowiki\.com)?/gi, 'https://dmowiki.com');
  html = html.replace(/\/web\/\d+\w*\/(https?:\/\/dmowiki\.com)?/gi, '');

  return html;
}

// Legacy exports for backwards compatibility with server.ts
export async function warmupWiki(): Promise<{ success: boolean; message: string }> {
  return {
    success: true,
    message: 'Warmup is no longer needed — wiki pages are fetched via the Wayback Machine which bypasses Cloudflare automatically.',
  };
}

export function isWikiWarmedUp(): boolean {
  return true; // Always "warmed up" since we use Wayback Machine
}

export async function closeBrowser(): Promise<void> {
  // No browser to close — we use fetch now
}
