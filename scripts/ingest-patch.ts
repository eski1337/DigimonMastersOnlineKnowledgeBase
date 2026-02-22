/**
 * ingest-patch.ts
 *
 * Ingests scraped patch notes into Payload CMS.
 * Idempotent: uses sourceId as dedupe key, sourceHash for change detection.
 *
 * Flow:
 *   1. Authenticate with Payload CMS (get JWT token)
 *   2. Scrape patch notes (calls scraper or reads from stdin)
 *   3. For each entry:
 *      a. Query CMS for existing doc with same sourceId
 *      b. If exists and hash matches → skip (no change)
 *      c. If exists and hash differs → update
 *      d. If not exists → create
 *
 * Usage:
 *   pnpm ingest:patch                         # scrape + ingest (default)
 *   pnpm ingest:patch -- --ids 816,815,814    # scrape specific IDs + ingest
 *   pnpm ingest:patch -- --from 820           # probe from ID 820 down
 *   pnpm ingest:patch -- --dry-run            # scrape + print, don't write to CMS
 *
 * Env vars:
 *   CMS_ADMIN_EMAIL    — Payload admin email
 *   CMS_ADMIN_PASSWORD — Payload admin password
 *   NEXT_PUBLIC_CMS_URL — CMS base URL (default http://localhost:3001)
 */

import 'dotenv/config';
import fetch from 'node-fetch';
import sanitizeHtml from 'sanitize-html';
import { discoverAndScrape, scrapeSpecificIds, type ScrapedPatchNote } from './scrape-patch-notes';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';
const CMS_EMAIL = process.env.CMS_ADMIN_EMAIL;
const CMS_PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const DEFAULT_START_ID = 850;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  process.stderr.write(`[ingest] ${msg}\n`);
}

function slugify(title: string, sourceId: number): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base}-${sourceId}`;
}

/**
 * Sanitize scraped HTML for safe storage and rendering.
 * Uses sanitize-html with a strict allowlist.
 */
function cleanHtml(raw: string): string {
  return sanitizeHtml(raw, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'b', 'i', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'figure', 'figcaption',
    ],
    allowedAttributes: {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'style'],
      'td': ['colspan', 'rowspan'],
      'th': ['colspan', 'rowspan'],
    },
    allowedSchemes: ['http', 'https'],
    // Rewrite relative image URLs to absolute
    transformTags: {
      'a': (tagName, attribs) => {
        const href = attribs.href || '';
        return {
          tagName,
          attribs: {
            ...attribs,
            href: href.startsWith('/') ? `https://dmo.gameking.com${href}` : href,
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        };
      },
      'img': (tagName, attribs) => {
        const src = attribs.src || '';
        return {
          tagName,
          attribs: {
            ...attribs,
            src: src.startsWith('/') ? `https://dmo.gameking.com${src}` : src,
          },
        };
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Payload CMS REST API helpers
// ---------------------------------------------------------------------------

let authToken: string | null = null;

async function authenticate(): Promise<string> {
  if (!CMS_EMAIL || !CMS_PASSWORD) {
    throw new Error(
      'Missing CMS_ADMIN_EMAIL or CMS_ADMIN_PASSWORD in .env. ' +
      'These are required to authenticate with Payload CMS.'
    );
  }

  log(`Authenticating as ${CMS_EMAIL}...`);

  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CMS_EMAIL, password: CMS_PASSWORD }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CMS login failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { token?: string };
  if (!data.token) {
    throw new Error('CMS login response missing token');
  }

  log('  ✓ Authenticated');
  authToken = data.token;
  return data.token;
}

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `JWT ${authToken}`,
  };
}

interface PayloadDoc {
  id: string;
  sourceId?: number;
  sourceHash?: string;
  [key: string]: unknown;
}

async function findBySourceId(sourceId: number): Promise<PayloadDoc | null> {
  const params = new URLSearchParams({
    'where[sourceId][equals]': String(sourceId),
    limit: '1',
  });

  const res = await fetch(`${CMS_URL}/api/patchNotes?${params}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    log(`  ⚠ Failed to query CMS for sourceId=${sourceId}: ${res.status}`);
    return null;
  }

  const data = (await res.json()) as { docs: PayloadDoc[] };
  return data.docs[0] || null;
}

async function createPatchNote(entry: ScrapedPatchNote): Promise<boolean> {
  const sanitized = cleanHtml(entry.htmlContent);
  const slug = slugify(entry.title, entry.sourceId);

  const body = {
    title: entry.title,
    slug,
    publishedDate: entry.date,
    content: sanitized,       // richText field — store sanitized HTML
    htmlContent: sanitized,   // dedicated HTML field for safe rendering
    url: entry.sourceUrl,
    sourceId: entry.sourceId,
    sourceHash: entry.contentHash,
    published: true,
  };

  const res = await fetch(`${CMS_URL}/api/patchNotes`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    log(`  ✗ Failed to create idx=${entry.sourceId}: ${res.status} ${text.slice(0, 200)}`);
    return false;
  }

  return true;
}

async function updatePatchNote(docId: string, entry: ScrapedPatchNote): Promise<boolean> {
  const sanitized = cleanHtml(entry.htmlContent);

  const body = {
    title: entry.title,
    publishedDate: entry.date,
    content: sanitized,
    htmlContent: sanitized,
    url: entry.sourceUrl,
    sourceHash: entry.contentHash,
  };

  const res = await fetch(`${CMS_URL}/api/patchNotes/${docId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    log(`  ✗ Failed to update idx=${entry.sourceId}: ${res.status} ${text.slice(0, 200)}`);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main ingestion logic
// ---------------------------------------------------------------------------

interface IngestStats {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function ingest(entries: ScrapedPatchNote[], dryRun: boolean): Promise<IngestStats> {
  const stats: IngestStats = { total: entries.length, created: 0, updated: 0, skipped: 0, errors: 0 };

  if (dryRun) {
    log('DRY RUN — not writing to CMS');
    for (const entry of entries) {
      const sanitized = cleanHtml(entry.htmlContent);
      log(`  [dry] idx=${entry.sourceId} "${entry.title}" (${entry.date}) — ${sanitized.length} chars sanitized`);
    }
    stats.skipped = entries.length;
    return stats;
  }

  await authenticate();

  for (const entry of entries) {
    log(`Processing idx=${entry.sourceId} "${entry.title}"...`);

    try {
      const existing = await findBySourceId(entry.sourceId);

      if (existing) {
        if (existing.sourceHash === entry.contentHash) {
          log(`  → Skip (no change)`);
          stats.skipped++;
        } else {
          log(`  → Update (hash changed)`);
          const ok = await updatePatchNote(existing.id, entry);
          if (ok) {
            stats.updated++;
            log(`  ✓ Updated`);
          } else {
            stats.errors++;
          }
        }
      } else {
        log(`  → Create (new)`);
        const ok = await createPatchNote(entry);
        if (ok) {
          stats.created++;
          log(`  ✓ Created`);
        } else {
          stats.errors++;
        }
      }
    } catch (err) {
      log(`  ✗ Error: ${(err as Error).message}`);
      stats.errors++;
    }
  }

  return stats;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(): { from: number; ids?: number[]; dryRun: boolean } {
  // Filter out '--' separators that pnpm/npm inject
  const args = process.argv.slice(2).filter(a => a !== '--');
  let from = DEFAULT_START_ID;
  let ids: number[] | undefined;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--from' && args[i + 1]) {
      from = parseInt(args[i + 1], 10);
      i++;
    }
    if (args[i] === '--ids' && args[i + 1]) {
      // Handle both comma and space separated IDs (PowerShell converts commas to spaces)
      ids = args[i + 1].split(/[,\s]+/).map(Number).filter(n => !isNaN(n) && n > 0);
      i++;
    }
    if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }

  return { from, ids, dryRun };
}

async function main() {
  const { from, ids, dryRun } = parseArgs();

  log('=== DMO Patch Notes Ingestion ===');
  log(`CMS: ${CMS_URL}`);

  // Phase 1: Scrape
  let entries: ScrapedPatchNote[];

  if (ids && ids.length > 0) {
    entries = await scrapeSpecificIds(ids);
  } else {
    entries = await discoverAndScrape(from);
  }

  if (entries.length === 0) {
    log('No entries found to ingest.');
    return;
  }

  log(`\nScraped ${entries.length} entries. Starting ingestion...\n`);

  // Phase 2: Ingest
  const stats = await ingest(entries, dryRun);

  // Phase 3: Summary
  log('\n=== Ingestion Summary ===');
  log(`  Total scraped:  ${stats.total}`);
  log(`  Created:        ${stats.created}`);
  log(`  Updated:        ${stats.updated}`);
  log(`  Skipped (same): ${stats.skipped}`);
  log(`  Errors:         ${stats.errors}`);
}

main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
