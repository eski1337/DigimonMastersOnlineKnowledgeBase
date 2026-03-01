/**
 * Patch Notes Scraper Service — fetches events and patch notes from the official
 * Digimon Masters Online website (dmo.gameking.com) and syncs them into the CMS.
 *
 * Data sources:
 *   - Events:      https://dmo.gameking.com/News/AjaxEventList.aspx?page=N
 *   - Patch Notes: https://dmo.gameking.com/News/AjaxPatchNoteList.aspx?page=N
 *   - Detail page: https://dmo.gameking.com/News/EventView.aspx?idx=XXX
 *                   https://dmo.gameking.com/News/PatchNoteView.aspx?idx=XXX
 *
 * Deduplication: uses `sourceId` (idx) field in patchNotes collection.
 * Change detection: uses `sourceHash` (SHA-256 of content).
 */
import * as cheerio from 'cheerio';
import crypto from 'crypto';
import { createLogger } from './logger';

const log = createLogger('patchnotes-scraper');

const BASE_URL = 'https://dmo.gameking.com';
const USER_AGENT = 'DMOKB-Scraper/1.0 (+https://dmokb.info)';
const FETCH_TIMEOUT = 15000;

// --- Types ---

interface SourceArticle {
  idx: number;
  subject: string;
  reg_date: string; // MM-DD-YYYY
  read_cnt: string;
  int_state?: string; // Events only: 1=FINISHED, 2=WAITING, 3=IN_PROGRESS
}

export interface ScrapedPatchNote {
  sourceId: number;
  title: string;
  slug: string;
  publishedDate: string; // ISO date
  content: string;       // plain text
  htmlContent: string;   // sanitized HTML
  url: string;
  sourceHash: string;
}

export interface ScrapeResult {
  created: number;
  updated: number;
  unchanged: number;
  errors: string[];
  total: number;
}

// --- Helpers ---

async function fetchJSON(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      method: 'POST', // gameking AJAX endpoints use POST
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchHTML(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseDate(regDate: string): string {
  // reg_date format: MM-DD-YYYY → ISO date
  const parts = regDate.split('-');
  if (parts.length !== 3) return new Date().toISOString();
  const [month, day, year] = parts;
  return new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString();
}

function slugify(text: string, sourceId: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
  return `${base}-${sourceId}`;
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

function extractContent(html: string): { text: string; sanitizedHtml: string } {
  const $ = cheerio.load(html);

  // Primary target: .ck-content is the CKEditor article body on gameking.com
  let $content = $('.ck-content');

  // Fallback: .view > .note (older page layout)
  if ($content.length === 0) {
    $content = $('.view > .note');
  }

  // Fallback: #content .view (broader match but still scoped)
  if ($content.length === 0) {
    $content = $('#content .view');
  }

  if ($content.length === 0) {
    return { text: '', sanitizedHtml: '' };
  }

  // Remove unwanted sections that may be inside the content container
  $content.find('script, style, .comments, .handlers, .pagex, .func, .ctrl').remove();
  $content.find('.comment-wrap, .comment-write, .btn-comment').remove();

  // Fix relative image URLs
  $content.find('img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('http')) {
      $(el).attr('src', `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`);
    }
  });

  // Fix relative link URLs
  $content.find('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href && !href.startsWith('http') && !href.startsWith('mailto:')) {
      $(el).attr('href', `${BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`);
    }
  });

  const sanitizedHtml = $content.html() || '';
  const text = $content.text().replace(/\s+/g, ' ').trim();

  return { text, sanitizedHtml };
}

// --- Core scraper ---

async function fetchArticleList(type: 'event' | 'patchnote', maxPages = 3): Promise<SourceArticle[]> {
  const endpoint = type === 'event'
    ? `${BASE_URL}/News/AjaxEventList.aspx`
    : `${BASE_URL}/News/AjaxPatchNoteList.aspx`;

  const allArticles: SourceArticle[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      const data = await fetchJSON(`${endpoint}?page=${page}`);
      if (!Array.isArray(data) || data.length === 0) break;

      for (const item of data) {
        allArticles.push({
          idx: parseInt(item.idx, 10),
          subject: item.subject || '',
          reg_date: item.reg_date || '',
          read_cnt: item.read_cnt || '0',
          int_state: item.int_state,
        });
      }
    } catch (e: any) {
      log.warn({ page, type, error: e.message }, 'Failed to fetch article list page');
      break;
    }
  }

  return allArticles;
}

async function fetchArticleDetail(type: 'event' | 'patchnote', idx: number): Promise<ScrapedPatchNote | null> {
  const viewPage = type === 'event' ? 'EventView' : 'PatchNoteView';
  const url = `${BASE_URL}/News/${viewPage}.aspx?idx=${idx}`;

  try {
    const html = await fetchHTML(url);
    const $ = cheerio.load(html);

    // Extract title from the page (fallback to list subject)
    const pageTitle = $('.view-title, .board-view-title, h2.title, .sub-title').first().text().trim();

    const { text, sanitizedHtml } = extractContent(html);

    if (!text && !sanitizedHtml) {
      log.warn({ idx, type }, 'No content extracted from detail page');
      return null;
    }

    return {
      sourceId: idx,
      title: pageTitle || '',
      slug: '',          // filled by caller
      publishedDate: '', // filled by caller
      content: text.substring(0, 500000),
      htmlContent: sanitizedHtml.substring(0, 500000),
      url,
      sourceHash: hashContent(sanitizedHtml || text),
    };
  } catch (e: any) {
    log.error({ idx, type, error: e.message }, 'Failed to fetch article detail');
    return null;
  }
}

// --- Public API ---

/**
 * Scrape events and patch notes from the official site and sync to CMS.
 * Uses Payload's local API for document creation/update.
 */
export async function scrapeAndSync(options?: { dryRun?: boolean; maxPages?: number }): Promise<ScrapeResult> {
  const dryRun = options?.dryRun ?? false;
  const maxPages = options?.maxPages ?? 3;

  let payload: any;
  try {
    payload = require('payload');
  } catch (e: any) {
    log.error('Payload not available for scraper');
    return { created: 0, updated: 0, unchanged: 0, errors: ['Payload not initialized'], total: 0 };
  }

  const result: ScrapeResult = { created: 0, updated: 0, unchanged: 0, errors: [], total: 0 };

  // Fetch both event and patch note lists
  const [events, patchNotes] = await Promise.all([
    fetchArticleList('event', maxPages),
    fetchArticleList('patchnote', maxPages),
  ]);

  const allArticles = [
    ...events.map(a => ({ ...a, type: 'event' as const })),
    ...patchNotes.map(a => ({ ...a, type: 'patchnote' as const })),
  ];

  result.total = allArticles.length;
  log.info({ events: events.length, patchNotes: patchNotes.length }, 'Fetched article lists');

  for (const article of allArticles) {
    try {
      // Check if already exists by sourceId
      const existing = await payload.find({
        collection: 'patchNotes',
        where: { sourceId: { equals: article.idx } },
        limit: 1,
        depth: 0,
      });

      const slug = slugify(article.subject, article.idx);
      const publishedDate = parseDate(article.reg_date);

      // Determine eventStatus and sourceType
      const sourceType = article.type; // 'event' or 'patchnote'
      let eventStatus: string | undefined;
      if (article.type === 'event') {
        eventStatus = article.int_state === '3' ? 'in_progress' : 'finished';
      }

      if (existing.docs.length > 0) {
        const doc = existing.docs[0];
        // Always update eventStatus (can change from in_progress → finished)
        const statusChanged = eventStatus && doc.eventStatus !== eventStatus;
        if (statusChanged && !dryRun) {
          await payload.update({
            collection: 'patchNotes',
            id: doc.id,
            data: { eventStatus },
          });
        }
        // Skip detail fetch if we already have content
        if (doc.htmlContent && doc.sourceHash) {
          if (statusChanged) result.updated++; else result.unchanged++;
          continue;
        }
      }

      // Fetch detail page
      const detail = await fetchArticleDetail(article.type, article.idx);

      if (!detail) {
        result.errors.push(`Failed to fetch detail for idx=${article.idx}`);
        continue;
      }

      detail.title = detail.title || article.subject;
      detail.slug = slug;
      detail.publishedDate = publishedDate;

      if (existing.docs.length > 0) {
        const doc = existing.docs[0];

        // Check if content actually changed
        if (doc.sourceHash === detail.sourceHash) {
          result.unchanged++;
          continue;
        }

        // Update existing
        if (!dryRun) {
          await payload.update({
            collection: 'patchNotes',
            id: doc.id,
            data: {
              title: detail.title,
              content: detail.content,
              htmlContent: detail.htmlContent,
              sourceHash: detail.sourceHash,
              url: detail.url,
              eventStatus,
              sourceType,
            },
          });
        }
        result.updated++;
        log.info({ idx: article.idx, title: detail.title }, 'Updated patch note');
      } else {
        // Create new
        if (!dryRun) {
          await payload.create({
            collection: 'patchNotes',
            data: {
              title: detail.title,
              slug: detail.slug,
              publishedDate: detail.publishedDate,
              content: detail.content,
              htmlContent: detail.htmlContent,
              url: detail.url,
              sourceId: detail.sourceId,
              sourceHash: detail.sourceHash,
              eventStatus,
              sourceType,
              published: true,
            },
          });
        }
        result.created++;
        log.info({ idx: article.idx, title: detail.title }, 'Created patch note');
      }

      // Rate limit: small delay between detail fetches
      await new Promise(r => setTimeout(r, 500));

    } catch (e: any) {
      const msg = `Error processing idx=${article.idx}: ${e.message}`;
      result.errors.push(msg);
      log.error({ idx: article.idx, error: e.message }, 'Scrape error');
    }
  }

  log.info(result, 'Scrape complete');
  return result;
}

/**
 * Start a recurring scrape job (runs once a day).
 */
let scrapeInterval: ReturnType<typeof setInterval> | null = null;

export function startScrapeCron(intervalMs = 24 * 60 * 60 * 1000): void {
  if (scrapeInterval) return;
  log.info({ intervalMs }, 'Starting patch notes scrape cron');
  scrapeInterval = setInterval(async () => {
    try {
      const result = await scrapeAndSync();
      log.info(result, 'Scheduled scrape complete');
    } catch (e: any) {
      log.error({ error: e.message }, 'Scheduled scrape failed');
    }
  }, intervalMs);

  // Also run once on startup after a short delay
  setTimeout(async () => {
    try {
      const result = await scrapeAndSync();
      log.info(result, 'Initial scrape complete');
    } catch (e: any) {
      log.error({ error: e.message }, 'Initial scrape failed');
    }
  }, 30000); // 30s after startup to let Payload fully initialize
}

export function stopScrapeCron(): void {
  if (scrapeInterval) {
    clearInterval(scrapeInterval);
    scrapeInterval = null;
  }
}
