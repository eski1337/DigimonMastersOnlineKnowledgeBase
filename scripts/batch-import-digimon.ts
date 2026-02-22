/**
 * Batch Import All Digimon from DMO Wiki via CMS API
 * 
 * Calls the CMS /api/import-digimon endpoint (which fetches via Wayback Machine)
 * then auto-saves via /api/import-digimon/save.
 * 
 * Usage:
 *   npx tsx scripts/batch-import-digimon.ts                  (import all)
 *   npx tsx scripts/batch-import-digimon.ts --start=50       (resume from index 50)
 *   npx tsx scripts/batch-import-digimon.ts --retry-failed   (retry previously failed ones)
 *   npx tsx scripts/batch-import-digimon.ts --force           (re-import ALL, even existing, to get images)
 */

import * as fs from 'fs';
import * as path from 'path';

const CMS_URL = 'http://localhost:3001';
const NAMES_FILE = path.join(__dirname, 'digimon-names.json');
const RESULTS_FILE = path.join(__dirname, 'import-results.json');

// Delay between imports (longer for CF proxy browser navigation)
const IMPORT_DELAY_MS = 5000;
// Longer delay after errors
const ERROR_DELAY_MS = 3000;
// Max retries per Digimon
const MAX_RETRIES = 1;

interface ImportResult {
  success: boolean;
  error?: string;
  timestamp: string;
  retries?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Check which Digimon are already in the CMS */
async function getExistingDigimon(): Promise<Set<string>> {
  const existing = new Set<string>();
  let page = 1;
  const limit = 100;
  
  while (true) {
    try {
      const response = await fetch(
        `${CMS_URL}/api/digimon?limit=${limit}&page=${page}&depth=0`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (!response.ok) break;
      
      const data = await response.json();
      if (!data.docs || data.docs.length === 0) break;
      
      for (const doc of data.docs) {
        existing.add(doc.name);
        if (doc.slug) {
          existing.add(doc.slug.replace(/-/g, ' '));
        }
      }
      
      if (!data.hasNextPage) break;
      page++;
    } catch {
      break;
    }
  }
  
  return existing;
}

/** Import a single Digimon via the CMS endpoint with retries */
async function importAndSaveDigimon(name: string, retryCount = 0): Promise<ImportResult> {
  try {
    // Step 1: Import (CMS fetches from Wayback Machine + parses HTML)
    const importRes = await fetch(`${CMS_URL}/api/import-digimon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: name }),
    });
    
    if (!importRes.ok) {
      const err = await importRes.json().catch(() => ({ error: 'Unknown error' }));
      const errorMsg = err.error || JSON.stringify(err);
      
      // Retry on timeout/network errors
      if (retryCount < MAX_RETRIES && (errorMsg.includes('timeout') || errorMsg.includes('fetch failed') || errorMsg.includes('Wayback'))) {
        console.log(`  ⏳ Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await sleep(ERROR_DELAY_MS);
        return importAndSaveDigimon(name, retryCount + 1);
      }
      
      return { success: false, error: `Import ${importRes.status}: ${errorMsg}`, timestamp: new Date().toISOString(), retries: retryCount };
    }
    
    const importData = await importRes.json();
    
    if (!importData.preview || !importData.preview.name) {
      return { success: false, error: 'No preview data returned', timestamp: new Date().toISOString(), retries: retryCount };
    }
    
    // Step 2: Save to database
    const saveRes = await fetch(`${CMS_URL}/api/import-digimon/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(importData.preview),
    });
    
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({ error: 'Unknown error' }));
      return { success: false, error: `Save ${saveRes.status}: ${err.error || JSON.stringify(err)}`, timestamp: new Date().toISOString(), retries: retryCount };
    }
    
    return { success: true, timestamp: new Date().toISOString(), retries: retryCount };
  } catch (err: any) {
    // Retry on network errors
    if (retryCount < MAX_RETRIES) {
      console.log(`  ⏳ Network error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await sleep(ERROR_DELAY_MS);
      return importAndSaveDigimon(name, retryCount + 1);
    }
    return { success: false, error: err.message, timestamp: new Date().toISOString(), retries: retryCount };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const startIndex = parseInt(args.find(a => a.startsWith('--start='))?.split('=')[1] || '0', 10);
  const retryFailed = args.includes('--retry-failed');
  const forceAll = args.includes('--force');
  
  console.log('='.repeat(60));
  console.log('  DMO KB Batch Digimon Importer');
  console.log('='.repeat(60));
  console.log(`  CMS: ${CMS_URL}`);
  
  // Verify CMS is running
  try {
    const health = await fetch(`${CMS_URL}/api/digimon?limit=0`);
    if (!health.ok) throw new Error(`CMS returned ${health.status}`);
    console.log('  CMS: Connected');
  } catch (err: any) {
    console.error(`  CMS not reachable: ${err.message}`);
    console.error('  Start the CMS first: pnpm --filter cms dev');
    process.exit(1);
  }
  
  // Check CF proxy status
  try {
    const cfRes = await fetch('http://127.0.0.1:8191', { signal: AbortSignal.timeout(2000) });
    const cfData = await cfRes.json() as any;
    console.log(`  CF Proxy: ${cfData.status === 'ready' ? '✅ Ready (direct dmowiki.com access)' : '⚠️ Not ready'}`);
  } catch {
    console.log('  CF Proxy: ❌ Not running (will use Wayback Machine fallback)');
  }
  
  // Load names
  if (!fs.existsSync(NAMES_FILE)) {
    console.error(`Names file not found: ${NAMES_FILE}`);
    process.exit(1);
  }
  
  const allNames: string[] = JSON.parse(fs.readFileSync(NAMES_FILE, 'utf-8'));
  console.log(`  Total names in list: ${allNames.length}`);
  
  // Get existing
  const existing = await getExistingDigimon();
  console.log(`  Already in CMS: ${existing.size}`);
  
  // Load previous results
  let results: Record<string, ImportResult> = {};
  if (fs.existsSync(RESULTS_FILE)) {
    results = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
  }
  
  // Determine what to import
  let toImport: string[];
  if (forceAll) {
    toImport = [...allNames];
    console.log(`  Force re-importing ALL ${toImport.length} Digimon (including existing)`);
  } else if (retryFailed) {
    toImport = Object.entries(results)
      .filter(([_, r]) => !r.success)
      .map(([name]) => name);
    console.log(`  Retrying ${toImport.length} previously failed imports`);
  } else {
    toImport = allNames.filter(n => !existing.has(n) && !results[n]?.success);
    console.log(`  To import: ${toImport.length}`);
  }
  
  if (startIndex > 0) {
    console.log(`  Starting from index: ${startIndex}`);
    toImport = toImport.slice(startIndex);
  }
  
  if (toImport.length === 0) {
    console.log('\n  Nothing to import - all Digimon are already in the CMS!');
    return;
  }
  
  const estimatedMinutes = Math.ceil((toImport.length * IMPORT_DELAY_MS) / 60000);
  console.log(`  Estimated time: ~${estimatedMinutes} minutes`);
  console.log('='.repeat(60));
  
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();
  
  for (let i = 0; i < toImport.length; i++) {
    const name = toImport[i];
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const elapsedStr = `${Math.floor(elapsed / 60)}m${elapsed % 60}s`;
    
    process.stdout.write(`[${i + 1}/${toImport.length}] (${elapsedStr}) ${name}... `);
    
    const result = await importAndSaveDigimon(name);
    results[name] = result;
    
    if (result.success) {
      successCount++;
      console.log('OK');
    } else {
      failCount++;
      console.log(`FAIL: ${result.error}`);
    }
    
    // Save results after each import (resume capability)
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    
    // Rate limit - longer delay after errors
    await sleep(result.success ? IMPORT_DELAY_MS : ERROR_DELAY_MS);
    
    // Progress summary every 25
    if ((i + 1) % 25 === 0) {
      const rate = successCount / ((Date.now() - startTime) / 60000);
      console.log(`\n--- Progress: ${i + 1}/${toImport.length} | OK: ${successCount} | FAIL: ${failCount} | Rate: ${rate.toFixed(1)}/min ---\n`);
    }
  }
  
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log('\n' + '='.repeat(60));
  console.log('  IMPORT COMPLETE');
  console.log('='.repeat(60));
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed:  ${failCount}`);
  console.log(`  Time:    ${Math.floor(totalTime / 60)}m${totalTime % 60}s`);
  console.log(`  Results: ${RESULTS_FILE}`);
  
  if (failCount > 0) {
    console.log(`\n  Failed Digimon:`);
    Object.entries(results)
      .filter(([_, r]) => !r.success)
      .forEach(([name, r]) => console.log(`    - ${name}: ${r.error}`));
    console.log(`\n  To retry failed: npx tsx scripts/batch-import-digimon.ts --retry-failed`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
