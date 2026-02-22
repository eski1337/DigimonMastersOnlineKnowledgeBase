# Data Import Guide

Comprehensive guide for importing content from external sources into your DMO Knowledge Base.

---

## 📥 Available Import Tools

### 1. DMOwiki Importer
Import Digimon data from dmowiki.com

### 2. Patch Notes Scraper  
Scrape official patch notes from dmo.gameking.com

---

## 🔧 DMOwiki Importer

### Prerequisites

✅ CMS must be running (`pnpm dev:cms`)  
✅ MongoDB must be running (`docker ps`)  
✅ You are an admin on dmowiki.com

### Single Digimon Import

Import one Digimon at a time:

```bash
pnpm import:dmowiki Agumon
```

**Output:**
```
🎯 Importing: Agumon
📡 Fetching: https://dmowiki.com/wiki/Agumon
🔍 Parsing Digimon data...

📋 Parsed Data:
   Name: Agumon
   Rank: Rookie
   Element: Fire
   Attribute: Vaccine
   Families: Dragon's Roar, Nature Spirits
   Skills: 2
   Images: 3
   Stats: HP 850, AT 120, DE 85

💾 Saving to CMS...
✅ Saved successfully!

✨ Import complete!
🔗 View at: http://localhost:3001/admin/collections/digimon
```

### Batch Import

Import multiple Digimon in one command:

```bash
pnpm import:dmowiki Agumon Gabumon Greymon Garurumon WarGreymon
```

**Features:**
- Automatic throttling (2s between requests)
- Skips duplicates
- Shows progress for each Digimon
- Summary report at the end

### What Gets Imported

The importer extracts:

- ✅ **Basic Info**: Name, rank, element, attribute
- ✅ **Families**: All family classifications
- ✅ **Stats**: HP, DS, AT, DE, CT, HT, BL, EV
- ✅ **Skills**: Names and descriptions
- ✅ **Size**: Size percentage
- ✅ **Obtain Info**: How to get the Digimon
- ✅ **Sources**: Where to find it
- ✅ **Images**: All available images
- ✅ **Notes**: Additional information

### Troubleshooting

#### "Digimon already exists"
**Solution**: Use CMS admin panel to update existing Digimon manually

#### "Failed to fetch: 404"
**Possible causes**:
- Digimon name spelling incorrect
- Page doesn't exist on dmowiki
- **Solution**: Check exact name on dmowiki.com

#### "Failed to save"
**Possible causes**:
- CMS not running
- MongoDB connection issue
- **Solution**: Check CMS is running and MongoDB is accessible

### Customization

The importer uses CSS selectors to parse content. If dmowiki structure changes, update selectors in:

**File**: `scripts/import-dmowiki.ts`

```typescript
// Example selectors that may need updating
const rankText = infobox.find('tr:contains("Rank"), tr:contains("Level")').find('td').text().trim();
const elementText = infobox.find('tr:contains("Element"), tr:contains("Type")').find('td').text().trim();
```

---

## 📰 Patch Notes Scraper

### Prerequisites

✅ CMS must be running  
✅ MongoDB must be running  
✅ Internet connection

### Run Scraper

```bash
pnpm scrape:patch
```

**Output:**
```
🚀 Patch Notes Scraper Starting...

📡 Fetching news from: https://dmo.gameking.com/News/News.aspx
🔍 Parsing news page...
✅ Found 10 patch note(s)

[1/10] Processing: Game Update v1.2.3
  📄 Fetching detail from: https://...
  ✅ Saved successfully

[2/10] Processing: Maintenance Notice
  ⏭️  Already exists, skipping

...

==================================================
📊 Summary:
   Total found: 10
   Saved: 8
   Skipped: 2
==================================================
```

### What Gets Scraped

- ✅ **Title**: Patch note title
- ✅ **Version**: Extracted if present (e.g., "v1.2.3")
- ✅ **Published Date**: When the patch was released
- ✅ **Content**: Full patch note content (HTML)
- ✅ **URL**: Link to original patch note

### Features

- **Duplicate Detection**: Skips already imported patches
- **Auto-throttling**: 2-second delay between requests
- **HTML Content**: Preserves formatting
- **Version Extraction**: Automatically detects version numbers

### Customization

If the official website structure changes, update selectors in:

**File**: `scripts/scrape-patch-notes.ts`

```typescript
// Example selectors that may need updating
$('.news-item, .newslist tr, article').each((_, element) => {
  const title = $elem.find('.title, .news-title, h3, a').first().text().trim();
  const dateText = $elem.find('.date, .time, .publish-date').text().trim();
  // ...
});
```

---

## ⚙️ Configuration

### Environment Variables

All importers respect these settings from `.env`:

```env
# CMS URL
NEXT_PUBLIC_CMS_URL=http://localhost:3001

# Official site (for patch notes)
OFFICIAL_SITE_URL=https://dmo.gameking.com

# Throttle delay (milliseconds)
INGEST_THROTTLE_MS=2000
```

### Adjust Throttle

To import faster (risk of being rate-limited):

```env
INGEST_THROTTLE_MS=1000  # 1 second delay
```

To import slower (more respectful):

```env
INGEST_THROTTLE_MS=5000  # 5 second delay
```

---

## 🎯 Best Practices

### For DMOwiki Import

1. **Start Small**: Import 1-2 Digimon first to test
2. **Verify Data**: Check imported data in CMS admin
3. **Batch Import**: Use batch import for multiple Digimon
4. **Review Before Publish**: Check all fields are correct
5. **Add Evolution Chains**: Manually add digivolution relationships

### For Patch Notes

1. **Run Regularly**: Schedule weekly/monthly runs
2. **Check Duplicates**: Scraper auto-skips duplicates
3. **Review Content**: HTML may need formatting fixes
4. **Publish Selectively**: Not all news items may be patch notes

---

## 📊 Import Workflow

### Complete Import Flow

```bash
# 1. Start infrastructure
pnpm docker:up

# 2. Start CMS
pnpm dev:cms

# 3. Import Digimon (wait for CMS to be ready)
pnpm import:dmowiki Agumon Gabumon Greymon

# 4. Scrape patch notes
pnpm scrape:patch

# 5. Review in CMS
# Open http://localhost:3001/admin
# Navigate to Digimon or Patch Notes collection
# Verify and publish content
```

---

## 🔍 Verification

### Check Imported Data

1. **Go to CMS Admin**: http://localhost:3001/admin
2. **Navigate to Collection**: Digimon or Patch Notes
3. **Check Fields**: Verify all data imported correctly
4. **Add Missing Data**: Fill in any missing fields
5. **Add Relationships**: Link digivolution chains, related guides, etc.
6. **Publish**: Check "Published" box to make visible

---

## 🛠️ Advanced Usage

### Create Custom Importer

Follow this template:

```typescript
// scripts/import-custom.ts
import * as cheerio from 'cheerio';

const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';

async function fetchData(url: string) {
  const response = await fetch(url);
  return response.text();
}

async function parseData(html: string) {
  const $ = cheerio.load(html);
  // Your parsing logic
  return parsedData;
}

async function saveToCMS(data: any) {
  await fetch(`${CMS_URL}/api/your-collection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

async function main() {
  const html = await fetchData('https://...');
  const data = await parseData(html);
  await saveToCMS(data);
}

main();
```

### Add Script to package.json

```json
{
  "scripts": {
    "import:custom": "tsx scripts/import-custom.ts"
  }
}
```

---

## 📝 Notes

### Legal & Ethical

- ✅ You are an admin on dmowiki.com - permission granted
- ✅ Patch notes are public information
- ⚠️ Always respect rate limits
- ⚠️ Credit sources when appropriate

### Performance

- **Throttling**: Prevents rate limiting
- **Batch Size**: Recommend max 50 Digimon per batch
- **Timing**: Run during off-peak hours for large imports

### Data Quality

- **Manual Review**: Always review imported data
- **Missing Fields**: Some data may not be available
- **HTML Content**: May need cleanup/formatting
- **Images**: May need to be downloaded separately

---

## 🆘 Support

If you encounter issues:

1. Check CMS is running: `curl http://localhost:3001/admin`
2. Check MongoDB: `docker ps`
3. Check logs: Terminal running `pnpm dev:cms`
4. Check website structure: May have changed, update selectors

---

**Happy Importing!** 🚀
