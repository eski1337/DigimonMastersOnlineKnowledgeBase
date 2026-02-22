/**
 * scrape-patch-notes.ts
 * 
 * Scrapes patch notes (called "Events" on the official site) from
 * https://dmo.gameking.com/News/EventList.aspx
 * 
 * Detail pages: https://dmo.gameking.com/News/EventView.aspx?idx=<ID>
 * 
 * HTML structure (confirmed via inspection):
 *   - Title:   div.view > div.info > div.subj > strong (text after status span)
 *   - Date:    div.d-v-info > div.regdate > div  (format: MM-DD-YYYY)
 *   - Status:  span.mode  (class "closed" = finished, "ongoing" = active)
 *   - Content: div.ck-content  (CKEditor 5 HTML)
 * 
 * The list page loads entries via client-side AJAX, so we cannot parse it 
 * server-side. Instead, we discover IDs by probing from the highest known ID
 * downward, stopping after N consecutive 404s.
 * 
 * Usage:
 *   pnpm scrape:patch                    # scrape latest (default: probe from 850 down)
 *   pnpm scrape:patch -- --from 820      # start from specific ID
 *   pnpm scrape:patch -- --ids 816,815   # scrape specific IDs only
 * 
 * Output: JSON array of ScrapedPatchNote objects to stdout.
 *         Progress/errors go to stderr.
 */

import 'dotenv/config';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrapedPatchNote {
  sourceId: number;
  sourceUrl: string;
  title: string;
  date: string;            // ISO 8601 (YYYY-MM-DD)
  status: string;          // 'ongoing' | 'closed' | 'unknown'
  htmlContent: string;     // raw CKEditor HTML (NOT yet sanitized)
  contentHash: string;     // SHA-256 of htmlContent for change detection
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.OFFICIAL_SITE_URL || 'https://dmo.gameking.com';
const THROTTLE_MS = parseInt(process.env.INGEST_THROTTLE_MS || '2000', 10);
const MAX_CONSECUTIVE_MISSES = 5;  // stop probing after this many 404s in a row
const DEFAULT_START_ID = 850;      // start probing from here (higher = newer)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg: string) {
  process.stderr.write(`[scraper] ${msg}\n`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function hashContent(html: string): string {
  return crypto.createHash('sha256').update(html).digest('hex');
}

/**
 * Parse MM-DD-YYYY into ISO YYYY-MM-DD.
 * Falls back to today if unparseable.
 */
function parseDate(raw: string): string {
  const trimmed = raw.trim();
  // Try MM-DD-YYYY
  const m = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (m) {
    return `${m[3]}-${m[1]}-${m[2]}`;
  }
  // Try YYYY-MM-DD already
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  log(`  ⚠ Could not parse date "${raw}", using today`);
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Scrape a single detail page
// ---------------------------------------------------------------------------

async function scrapeDetailPage(id: number): Promise<ScrapedPatchNote | null> {
  const url = `${BASE_URL}/News/EventView.aspx?idx=${id}`;
  
  let res;
  try {
    res = await fetch(url, {
      headers: {
        'User-Agent': 'DMOKB-Scraper/1.0 (knowledge base; non-commercial)',
        'Accept': 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
  } catch (err) {
    log(`  ✗ Network error for idx=${id}: ${(err as Error).message}`);
    return null;
  }

  if (!res.ok) {
    if (res.status === 404) return null;
    log(`  ✗ HTTP ${res.status} for idx=${id}`);
    return null;
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Check if this is a valid event page (has the .view container)
  const viewEl = $('div.view');
  if (viewEl.length === 0) {
    return null; // not a valid page
  }

  // Title: div.subj > strong — strip the status span text
  const subjEl = viewEl.find('div.subj strong');
  const statusSpan = subjEl.find('span.mode span').text().trim();
  // Remove the status span to get clean title
  subjEl.find('span.mode').remove();
  const title = subjEl.text().trim();
  
  if (!title) {
    log(`  ⚠ Empty title for idx=${id}, skipping`);
    return null;
  }

  // Date: div.regdate > div
  const dateRaw = viewEl.find('div.regdate div').first().text().trim();
  const date = parseDate(dateRaw);

  // Status
  const modeEl = $('div.view span.mode');
  let status = 'unknown';
  if (modeEl.hasClass('closed')) status = 'closed';
  else if (modeEl.hasClass('ongoing') || modeEl.length > 0) status = 'ongoing';

  // Content: div.ck-content inner HTML
  const ckContent = viewEl.find('div.ck-content');
  const htmlContent = ckContent.html()?.trim() || '';

  if (!htmlContent) {
    log(`  ⚠ Empty content for idx=${id} ("${title}"), skipping`);
    return null;
  }

  const contentHash = hashContent(htmlContent);

  return {
    sourceId: id,
    sourceUrl: url,
    title,
    date,
    status,
    htmlContent,
    contentHash,
  };
}

// ---------------------------------------------------------------------------
// Discovery: probe IDs from startId downward
// ---------------------------------------------------------------------------

async function discoverAndScrape(startId: number, maxItems: number = 50): Promise<ScrapedPatchNote[]> {
  const results: ScrapedPatchNote[] = [];
  let consecutiveMisses = 0;
  let currentId = startId;

  log(`Starting probe from idx=${startId}, max ${maxItems} items, throttle ${THROTTLE_MS}ms`);

  while (results.length < maxItems && consecutiveMisses < MAX_CONSECUTIVE_MISSES && currentId > 0) {
    log(`Fetching idx=${currentId}...`);
    
    const entry = await scrapeDetailPage(currentId);
    
    if (entry) {
      log(`  ✓ "${entry.title}" (${entry.date}) [${entry.status}] ${entry.htmlContent.length} chars`);
      results.push(entry);
      consecutiveMisses = 0;
    } else {
      consecutiveMisses++;
      log(`  – miss (${consecutiveMisses}/${MAX_CONSECUTIVE_MISSES})`);
    }

    currentId--;
    
    if (currentId > 0 && consecutiveMisses < MAX_CONSECUTIVE_MISSES) {
      await sleep(THROTTLE_MS);
    }
  }

  log(`Done. Found ${results.length} entries (probed ${startId - currentId} IDs).`);
  return results;
}

// ---------------------------------------------------------------------------
// Scrape specific IDs
// ---------------------------------------------------------------------------

async function scrapeSpecificIds(ids: number[]): Promise<ScrapedPatchNote[]> {
  const results: ScrapedPatchNote[] = [];

  log(`Scraping ${ids.length} specific IDs: ${ids.join(', ')}`);

  for (const id of ids) {
    log(`Fetching idx=${id}...`);
    const entry = await scrapeDetailPage(id);
    
    if (entry) {
      log(`  ✓ "${entry.title}" (${entry.date}) [${entry.status}] ${entry.htmlContent.length} chars`);
      results.push(entry);
    } else {
      log(`  ✗ No valid content for idx=${id}`);
    }

    await sleep(THROTTLE_MS);
  }

  log(`Done. Found ${results.length}/${ids.length} entries.`);
  return results;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(): { from: number; ids?: number[] } {
  // Filter out '--' separators that pnpm/npm inject
  const args = process.argv.slice(2).filter(a => a !== '--');
  let from = DEFAULT_START_ID;
  let ids: number[] | undefined;

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
  }

  log(`Parsed args: from=${from}, ids=${ids ? ids.join(',') : 'none'}`);
  return { from, ids };
}

async function main() {
  const { from, ids } = parseArgs();

  let results: ScrapedPatchNote[];

  if (ids && ids.length > 0) {
    results = await scrapeSpecificIds(ids);
  } else {
    results = await discoverAndScrape(from);
  }

  // Output to stdout as JSON (pipe-friendly)
  console.log(JSON.stringify(results, null, 2));

  log(`\nSummary: ${results.length} patch notes scraped`);
  if (results.length > 0) {
    log(`  Newest: idx=${results[0].sourceId} "${results[0].title}" (${results[0].date})`);
    log(`  Oldest: idx=${results[results.length - 1].sourceId} "${results[results.length - 1].title}" (${results[results.length - 1].date})`);
  }
}

// Export for use by ingest script
export { scrapeDetailPage, discoverAndScrape, scrapeSpecificIds };

// Run if called directly
main().catch((err) => {
  log(`Fatal error: ${err.message}`);
  process.exit(1);
});
