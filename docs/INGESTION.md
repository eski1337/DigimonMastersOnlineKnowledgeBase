# Patch Notes Ingestion Pipeline

## Overview

The ingestion pipeline scrapes patch notes from the official DMO site
(`https://dmo.gameking.com/News/EventList.aspx`) and upserts them into the
Payload CMS `PatchNotes` collection. It is **idempotent** — running it
multiple times will not create duplicates.

## Architecture

```
Official DMO Site                 Payload CMS (localhost:3001)
 EventView.aspx?idx=XXX  ──►  scrape-patch-notes.ts  ──►  ingest-patch.ts  ──►  PatchNotes collection
                               (cheerio parse)             (REST API upsert)     (MongoDB)
```

### Dedupe Strategy

1. **Primary key**: `sourceId` (the `idx` parameter from the official URL, stored as a unique indexed field)
2. **Change detection**: `sourceHash` (SHA-256 of the raw HTML content)
3. **On re-run**:
   - If `sourceId` exists and `sourceHash` matches → **skip** (no change)
   - If `sourceId` exists and `sourceHash` differs → **update** (content changed)
   - If `sourceId` does not exist → **create** (new entry)

### Content Safety

- Raw HTML from the official site is sanitized using `sanitize-html` (strict allowlist)
- Sanitized HTML is stored in the `htmlContent` field
- The frontend renders `htmlContent` through a second pass of `sanitize-html` (defense in depth)
- No `dangerouslySetInnerHTML` with unvalidated content

## Commands

### Scrape Only (prints JSON to stdout)

```bash
# Probe from default start ID (850) downward
pnpm scrape:patch

# Probe from a specific ID
npx tsx scripts/scrape-patch-notes.ts --from 820

# Scrape specific IDs only
npx tsx scripts/scrape-patch-notes.ts "--ids" "816 815 814"
```

### Scrape + Ingest into CMS

```bash
# Full pipeline: scrape + ingest (default: probe from 850)
pnpm ingest:patch

# Ingest specific IDs
npx tsx scripts/ingest-patch.ts "--ids" "816 815"

# Dry run (scrape + sanitize, don't write to CMS)
npx tsx scripts/ingest-patch.ts --dry-run

# Ingest from a specific start ID
npx tsx scripts/ingest-patch.ts --from 820
```

### PowerShell Note

On Windows PowerShell, commas are interpreted as array separators. Use
space-separated IDs in quotes: `"816 815 814"` instead of `816,815,814`.

## Prerequisites

1. **MongoDB running**: `docker-compose up -d`
2. **Payload CMS running**: `pnpm dev:cms`
3. **Environment variables** in `.env`:
   ```
   CMS_ADMIN_EMAIL=your-admin@example.com
   CMS_ADMIN_PASSWORD=your-password
   NEXT_PUBLIC_CMS_URL=http://localhost:3001
   OFFICIAL_SITE_URL=https://dmo.gameking.com
   INGEST_THROTTLE_MS=2000
   ```

## Running on a VPS via Cron

### Linux Cron (recommended)

```bash
# Edit crontab
crontab -e

# Run ingestion every 6 hours
0 */6 * * * cd /path/to/DMOKBNEW && npx tsx scripts/ingest-patch.ts --from 850 >> /var/log/dmo-ingest.log 2>&1
```

### PM2 Cron (if already using PM2)

Add to `ecosystem.config.js`:

```js
{
  name: 'patch-ingest',
  script: 'npx',
  args: 'tsx scripts/ingest-patch.ts --from 850',
  cron_restart: '0 */6 * * *',
  autorestart: false,
}
```

### Windows Task Scheduler

Create a scheduled task that runs:
```
cmd /c "cd /d D:\path\to\DMOKBNEW && npx tsx scripts/ingest-patch.ts --from 850"
```

## Schema Changes

The following fields were added to the `PatchNotes` collection
(`apps/cms/src/collections/PatchNotes.ts`):

| Field | Type | Purpose |
|-------|------|---------|
| `sourceId` | number (unique, indexed) | Official site `idx` parameter |
| `sourceHash` | text | SHA-256 of raw content for change detection |
| `htmlContent` | textarea | Pre-sanitized HTML for safe rendering |

These are **additive** — no migration needed. Existing documents will have
these fields as `undefined` and continue to work normally.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "CMS login failed" | Check `CMS_ADMIN_EMAIL` and `CMS_ADMIN_PASSWORD` in `.env`. Make sure the CMS is running. |
| "Empty title for idx=X" | That ID doesn't exist on the official site. Normal behavior. |
| "Network error" | Official site may be down or blocking requests. Check `OFFICIAL_SITE_URL`. |
| Duplicate slugs | The slug includes the `sourceId` suffix to prevent collisions. |
| Re-run creates duplicates | Should not happen — check that `sourceId` field exists in the CMS collection. |
