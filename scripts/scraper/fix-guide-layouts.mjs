#!/usr/bin/env node
/**
 * Fix Guide/System Layout Blocks
 *
 * Re-processes all guide and system layout blocks to:
 *   1. Convert first paragraph of each richText block to a proper h2 heading
 *   2. Parse inline table text into real table blocks
 *   3. Convert bullet-point text (• items) into proper list nodes
 *   4. Add callout blocks for notes/warnings
 *   5. Clean up empty paragraphs and whitespace
 *
 * Usage:
 *   node fix-guide-layouts.mjs [--dry-run] [--filter=slug] [--collection=guides|systems|both]
 */

const CMS_URL = process.env.CMS_URL || 'https://cms.dmokb.info';
const SVC_EMAIL = 'service@dmokb.info';
const SVC_PASSWORD = 'SvcFixRunner2026!';

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const FILTER = ARGS.find(a => a.startsWith('--filter='))?.split('=')[1] || null;
const COLLECTION = ARGS.find(a => a.startsWith('--collection='))?.split('=')[1] || 'both';
const RETRY_MAX = 5;
const RETRY_DELAYS = [5000, 15000, 30000, 60000, 120000];

let authToken = '';
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(level, msg) { console.log(`[${new Date().toLocaleTimeString()}] [${level}] ${msg}`); }

async function fetchWithRetry(url, options, label = '') {
  for (let attempt = 0; attempt < RETRY_MAX; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status >= 500) {
        const delay = RETRY_DELAYS[attempt] || 120000;
        log('WARN', `Rate limited (${res.status}) on ${label} — retry ${attempt + 1}/${RETRY_MAX} in ${delay / 1000}s`);
        await sleep(delay);
        continue;
      }
      return res;
    } catch (e) {
      if (attempt === RETRY_MAX - 1) throw e;
      await sleep(RETRY_DELAYS[attempt] || 120000);
    }
  }
  return fetch(url, options);
}

async function cmsLogin() {
  log('INFO', `Logging into CMS as ${SVC_EMAIL}...`);
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: SVC_EMAIL, password: SVC_PASSWORD }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Login failed');
  authToken = data.token;
  log('INFO', `Logged in`);
}

function authHeaders() { return { Authorization: `JWT ${authToken}` }; }

async function fetchAll(collection) {
  const docs = [];
  let page = 1, hasMore = true;
  while (hasMore) {
    const res = await fetchWithRetry(
      `${CMS_URL}/api/${collection}?limit=100&page=${page}&depth=0`,
      { headers: authHeaders() }, `fetchAll ${collection} p${page}`
    );
    const data = await res.json();
    docs.push(...(data.docs || []));
    hasMore = data.hasNextPage;
    page++;
    await sleep(300);
  }
  return docs;
}

// ═══════════════════════════════════════════════════════════════════════════
// Layout Block Restructuring
// ═══════════════════════════════════════════════════════════════════════════

function getNodeText(node) {
  if (!node) return '';
  if (node.text !== undefined) return node.text;
  if (node.children) return node.children.map(getNodeText).join('');
  return '';
}

function getBlockText(block) {
  if (!block.content) return '';
  return block.content.map(n => getNodeText(n)).join('\n');
}

/**
 * Detect if a paragraph looks like a heading (first paragraph in block,
 * short, no bullet points, acts as section title)
 */
function looksLikeHeading(text) {
  if (!text || text.length > 120) return false;
  if (text.startsWith('•') || text.startsWith('-') || text.startsWith('*')) return false;
  if (text.includes(' | ')) return false; // table row
  if (/^\d+[.)]/.test(text)) return false; // numbered list
  // Short, titlecase-ish text
  if (text.length < 80 && !text.endsWith('.') && !text.endsWith(',')) return true;
  return false;
}

/**
 * Detect if text looks like a table row (pipe-separated values)
 */
function looksLikeTableRow(text) {
  return text.includes(' | ') && text.split(' | ').length >= 2;
}

/**
 * Detect if text is a bullet point
 */
function isBulletPoint(text) {
  return /^[•\-\*]\s/.test(text.trim());
}

/**
 * Detect if text is a note/warning
 */
function isNoteOrWarning(text) {
  const lower = text.toLowerCase();
  return lower.startsWith('note:') || lower.startsWith('warning:') ||
         lower.startsWith('important:') || lower.startsWith('attention:') ||
         lower.startsWith('tip:');
}

/**
 * Parse a pipe-separated text into table data
 */
function parseInlineTable(rows) {
  const parsed = rows.map(r => r.split(' | ').map(c => c.trim()));
  if (parsed.length < 2) return null;

  // First row is usually headers — ensure no empty labels
  const headers = parsed[0].map((h, i) => ({ label: h || `Col ${i + 1}` }));
  const dataRows = parsed.slice(1).map(r => ({
    cells: r.map(c => ({ value: c })),
  }));

  return { headers, rows: dataRows };
}

/**
 * Restructure a single richText block into multiple properly-typed blocks
 */
function restructureRichTextBlock(block) {
  if (!block.content || !Array.isArray(block.content)) return [block];

  const result = [];
  let currentRichText = [];
  let tableRows = [];
  let bulletPoints = [];

  function flushRichText() {
    if (currentRichText.length > 0) {
      // Filter out empty paragraphs
      const filtered = currentRichText.filter(n => {
        const text = getNodeText(n).trim();
        return text.length > 0;
      });
      if (filtered.length > 0) {
        result.push({ blockType: 'richText', content: filtered });
      }
      currentRichText = [];
    }
  }

  function flushTable(title) {
    if (tableRows.length > 0) {
      const tableData = parseInlineTable(tableRows);
      if (tableData && tableData.rows.length > 0) {
        result.push({
          blockType: 'table',
          title: title || undefined,
          headers: tableData.headers,
          rows: tableData.rows,
        });
      }
      tableRows = [];
    }
  }

  function flushBullets() {
    if (bulletPoints.length > 0) {
      // Convert to a richText block with proper ul/li structure
      const listItems = bulletPoints.map(bp => ({
        type: 'li',
        children: [{ type: 'lic', children: [{ text: bp.replace(/^[•\-\*]\s*/, '') }] }],
      }));
      currentRichText.push({ type: 'ul', children: listItems });
      bulletPoints = [];
    }
  }

  let lastHeadingText = '';
  let isFirstNode = true;

  for (const node of block.content) {
    const text = getNodeText(node).trim();

    if (!text) continue;

    // Check if it's a note/warning → callout
    if (isNoteOrWarning(text)) {
      flushBullets();
      flushTable(lastHeadingText);
      flushRichText();

      let calloutType = 'info';
      if (text.toLowerCase().startsWith('warning:') || text.toLowerCase().startsWith('attention:')) calloutType = 'warning';
      if (text.toLowerCase().startsWith('tip:')) calloutType = 'tip';

      result.push({
        blockType: 'callout',
        type: calloutType,
        content: [{ type: 'p', children: [{ text }] }],
      });
      continue;
    }

    // Check if it looks like a table row
    if (looksLikeTableRow(text)) {
      flushBullets();
      tableRows.push(text);
      continue;
    } else if (tableRows.length > 0) {
      // End of table section
      flushTable(lastHeadingText);
    }

    // Check if it's a bullet point
    if (isBulletPoint(text)) {
      bulletPoints.push(text);
      continue;
    } else if (bulletPoints.length > 0) {
      flushBullets();
    }

    // Check if it's a heading (first node in block, or short title-like text)
    if (looksLikeHeading(text) && (isFirstNode || text.length < 60)) {
      flushRichText();
      lastHeadingText = text;

      // Determine heading level
      const headingType = isFirstNode ? 'h2' : 'h3';
      currentRichText.push({ type: headingType, children: [{ text }] });
      isFirstNode = false;
      continue;
    }

    isFirstNode = false;

    // Regular paragraph
    currentRichText.push(node);
  }

  // Flush remaining
  flushBullets();
  flushTable(lastHeadingText);
  flushRichText();

  return result;
}

/**
 * Process all layout blocks for a guide/system document
 */
function processLayout(layout) {
  if (!layout || !Array.isArray(layout)) return { changed: false, layout: [] };

  const newLayout = [];
  let changed = false;

  for (const block of layout) {
    if (block.blockType === 'richText') {
      const restructured = restructureRichTextBlock(block);
      if (restructured.length !== 1 || restructured[0] !== block) {
        changed = true;
      }
      newLayout.push(...restructured);
    } else {
      newLayout.push(block);
    }
  }

  // Remove duplicate consecutive blocks and fix empty table headers
  const deduplicated = [];
  for (let i = 0; i < newLayout.length; i++) {
    const block = newLayout[i];

    // Skip empty richText blocks
    if (block.blockType === 'richText') {
      const text = getBlockText(block).trim();
      if (!text) { changed = true; continue; }
    }

    // Fix empty table headers in existing or new table blocks
    if (block.blockType === 'table' && block.headers) {
      block.headers = block.headers.map((h, idx) => {
        if (!h.label || h.label.trim() === '') {
          return { ...h, label: idx === 0 ? ' ' : `Col ${idx + 1}` };
        }
        return h;
      });
    }

    deduplicated.push(block);
  }

  return { changed, layout: deduplicated };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║       Fix Guide/System Layout Blocks                       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('🔒 DRY RUN MODE — no changes will be made\n');

  await cmsLogin();

  const collections = COLLECTION === 'both' ? ['guides', 'systems'] : [COLLECTION];
  const stats = { processed: 0, changed: 0, errors: [], skipped: 0 };

  for (const coll of collections) {
    log('INFO', `Fetching all ${coll}...`);
    const docs = await fetchAll(coll);
    log('INFO', `Fetched ${docs.length} ${coll}`);

    for (const doc of docs) {
      if (FILTER && !doc.slug?.includes(FILTER)) continue;

      stats.processed++;
      const { changed, layout: newLayout } = processLayout(doc.layout);

      // Safety: skip if layout explodes too much (>3x original size)
      const origLen = doc.layout?.length || 0;
      if (newLayout.length > origLen * 3 && newLayout.length > 50) {
        log('SKIP', `${coll}/${doc.slug}: layout would explode from ${origLen} to ${newLayout.length} blocks — skipping`);
        stats.skipped++;
        continue;
      }

      if (!changed) {
        stats.skipped++;
        continue;
      }

      stats.changed++;
      log('FIX', `${coll}/${doc.slug}: ${doc.layout?.length || 0} blocks → ${newLayout.length} blocks`);

      if (!DRY_RUN) {
        try {
          const res = await fetchWithRetry(`${CMS_URL}/api/${coll}/${doc.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ layout: newLayout }),
          }, `patch ${coll}/${doc.slug}`);

          if (!res.ok) {
            const text = await res.text();
            log('ERROR', `Failed to patch ${coll}/${doc.slug}: ${text.slice(0, 200)}`);
            stats.errors.push(`${coll}/${doc.slug}: ${text.slice(0, 100)}`);
          }
          await sleep(500);
        } catch (e) {
          log('ERROR', `Failed to patch ${coll}/${doc.slug}: ${e.message}`);
          stats.errors.push(`${coll}/${doc.slug}: ${e.message}`);
        }
      }
    }
  }

  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                     FIX REPORT                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Processed:   ${stats.processed}`);
  console.log(`Changed:     ${stats.changed}`);
  console.log(`Skipped:     ${stats.skipped}`);
  console.log(`Errors:      ${stats.errors.length}`);

  if (stats.errors.length > 0) {
    console.log('\n--- Errors ---');
    for (const err of stats.errors) console.log(`  ✗ ${err}`);
  }
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
