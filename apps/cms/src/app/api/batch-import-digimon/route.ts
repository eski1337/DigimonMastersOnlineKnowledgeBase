import type { Request, Response } from 'express';

const DMOWIKI_API = 'https://dmowiki.com/api.php';
const CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';
const DELAY_BETWEEN_IMPORTS = 3000; // 3 seconds between each Digimon

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch Digimon starting with specific letters from MediaWiki API
 */
async function fetchDigimonByLetters(letters: string[]): Promise<string[]> {
  const allDigimon: string[] = [];
  
  for (const letter of letters) {
    let continueToken: string | undefined;
    
    do {
      const params = new URLSearchParams({
        action: 'query',
        list: 'categorymembers',
        cmtitle: 'Category:Digimon',
        cmstartsortkeyprefix: letter,
        cmendsortkeyprefix: letter + 'Z', // Get all starting with this letter
        cmlimit: '500',
        cmtype: 'page',
        format: 'json',
      });
      
      if (continueToken) {
        params.append('cmcontinue', continueToken);
      }
      
      const response = await fetch(`${DMOWIKI_API}?${params.toString()}`);
      const data: any = await response.json();
      
      if (data.query && data.query.categorymembers) {
        data.query.categorymembers.forEach((member: any) => {
          if (!member.title.includes(':') && member.title.startsWith(letter)) {
            allDigimon.push(member.title);
          }
        });
      }
      
      continueToken = data.continue?.cmcontinue;
      await sleep(1000);
    } while (continueToken);
  }
  
  return [...new Set(allDigimon)]; // Remove duplicates
}

/**
 * Check if Digimon exists in database
 */
async function digimonExists(name: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${CMS_URL}/api/digimon?where[name][equals]=${encodeURIComponent(name)}&limit=1`
    );
    if (!response.ok) return false;
    const data: any = await response.json();
    return data.docs && data.docs.length > 0;
  } catch {
    return false;
  }
}

/**
 * Import a single Digimon (server-side)
 */
async function importSingleDigimon(name: string): Promise<boolean> {
  try {
    const slug = name.replace(/\s+/g, '_');
    
    // Call the import endpoint
    const importResponse = await fetch(`${CMS_URL}/api/import-digimon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    });
    
    if (!importResponse.ok) {
      console.error(`Import failed for ${name}: ${importResponse.status}`);
      return false;
    }
    
    const previewData = await importResponse.json();
    
    if (previewData.error) {
      console.error(`Import error for ${name}:`, previewData.error);
      return false;
    }
    
    // Save to database
    const saveResponse = await fetch(`${CMS_URL}/api/import-digimon/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(previewData),
    });
    
    if (!saveResponse.ok) {
      console.error(`Save failed for ${name}: ${saveResponse.status}`);
      return false;
    }
    
    const saveResult = await saveResponse.json();
    return saveResult.success || false;
    
  } catch (error) {
    console.error(`Exception importing ${name}:`, error);
    return false;
  }
}

/**
 * Batch import endpoint
 */
export async function POST(request: Request, response: Response) {
  try {
    const { letters } = request.body;
    
    if (!letters || !Array.isArray(letters)) {
      return response.status(400).json({
        error: 'Invalid letters parameter'
      });
    }
    
    console.log(`\n🚀 Starting batch import for letters: ${letters.join(', ')}`);
    
    // Fetch Digimon for these letters
    const digimonList = await fetchDigimonByLetters(letters);
    console.log(`✅ Found ${digimonList.length} Digimon`);
    
    if (digimonList.length === 0) {
      return response.json({
        totalFound: 0,
        imported: 0,
        skipped: 0,
        failed: 0,
        importedList: [],
        failedList: [],
      });
    }
    
    // Filter out existing Digimon
    const toImport: string[] = [];
    let skipped = 0;
    
    for (const name of digimonList) {
      const exists = await digimonExists(name);
      if (exists) {
        skipped++;
      } else {
        toImport.push(name);
      }
    }
    
    console.log(`📥 Need to import: ${toImport.length}`);
    console.log(`⏭️ Already exist: ${skipped}`);
    
    // Import each Digimon
    const importedList: string[] = [];
    const failedList: string[] = [];
    
    for (const name of toImport) {
      console.log(`📥 Importing: ${name}`);
      
      const success = await importSingleDigimon(name);
      
      if (success) {
        importedList.push(name);
        console.log(`✅ Success: ${name}`);
      } else {
        failedList.push(name);
        console.log(`❌ Failed: ${name}`);
      }
      
      // Delay between imports
      await sleep(DELAY_BETWEEN_IMPORTS);
    }
    
    console.log(`\n✅ Batch complete!`);
    console.log(`   Imported: ${importedList.length}`);
    console.log(`   Failed: ${failedList.length}`);
    console.log(`   Skipped: ${skipped}`);
    
    return response.json({
      totalFound: digimonList.length,
      imported: importedList.length,
      skipped,
      failed: failedList.length,
      importedList,
      failedList,
    });
    
  } catch (error: any) {
    console.error('Batch import error:', error);
    return response.status(500).json({
      error: error.message || 'Batch import failed'
    });
  }
}
