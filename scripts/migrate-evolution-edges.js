/**
 * Migration Script: Populate evolution-edges from existing Digimon digivolution data.
 *
 * Reads all Digimon documents, extracts digivolvesTo entries,
 * and creates evolution-edge documents for each unique source→target pair.
 *
 * Run on VPS: node scripts/migrate-evolution-edges.js
 * Requires: PAYLOAD_SECRET + MONGODB_URI in .env
 */
const payload = require('payload');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const BATCH_SIZE = 100;

async function run() {
  console.log('=== Evolution Edges Migration ===\n');

  // Init Payload
  await payload.init({
    secret: process.env.PAYLOAD_SECRET,
    local: true, // no Express needed
  });

  // 1. Count existing edges
  const existing = await payload.find({ collection: 'evolution-edges', limit: 0 });
  console.log(`Existing evolution-edges: ${existing.totalDocs}`);
  if (existing.totalDocs > 0) {
    console.log('WARNING: evolution-edges already has data. Skipping duplicates.\n');
  }

  // 2. Load all Digimon
  const allDigimon = [];
  let page = 1;
  while (true) {
    const batch = await payload.find({ collection: 'digimon', limit: BATCH_SIZE, page, depth: 1 });
    allDigimon.push(...batch.docs);
    if (!batch.hasNextPage) break;
    page++;
  }
  console.log(`Total Digimon loaded: ${allDigimon.length}\n`);

  // 3. Build slug→ID and name→doc maps
  const slugToId = new Map();
  const nameToDoc = new Map();
  for (const d of allDigimon) {
    slugToId.set(d.slug, d.id);
    nameToDoc.set(d.name, d);
  }

  // 4. Build existing edge set (to skip duplicates)
  const existingEdges = new Set();
  if (existing.totalDocs > 0) {
    let ePage = 1;
    while (true) {
      const eBatch = await payload.find({ collection: 'evolution-edges', limit: 100, page: ePage, depth: 0 });
      for (const e of eBatch.docs) {
        const srcId = typeof e.source === 'string' ? e.source : e.source?.id;
        const tgtId = typeof e.target === 'string' ? e.target : e.target?.id;
        if (srcId && tgtId) existingEdges.add(`${srcId}->${tgtId}`);
      }
      if (!eBatch.hasNextPage) break;
      ePage++;
    }
  }

  // 5. Extract edges from digivolvesTo
  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const digimon of allDigimon) {
    const digivolvesTo = digimon.digivolutions?.digivolvesTo || [];
    if (digivolvesTo.length === 0) continue;

    for (const evo of digivolvesTo) {
      if (!evo.name) continue;

      const targetDoc = nameToDoc.get(evo.name);
      if (!targetDoc) {
        // Target Digimon doesn't exist in DB
        continue;
      }

      const sourceId = digimon.id;
      const targetId = targetDoc.id;
      const edgeKey = `${sourceId}->${targetId}`;

      if (existingEdges.has(edgeKey)) {
        skipped++;
        continue;
      }

      // Detect evolution type
      let evolutionType = 'normal';
      if (digimon.digivolutions?.jogress?.length > 0) {
        const isJogress = digimon.digivolutions.jogress.some(
          (j) => j.resultName === evo.name || j.partnerName === evo.name
        );
        if (isJogress) evolutionType = 'jogress';
      }
      if (evolutionType === 'normal') {
        if (targetDoc.name?.includes(' X') && !digimon.name?.includes(' X')) evolutionType = 'x-antibody';
        else if (targetDoc.form === 'Burst Mode') evolutionType = 'mode-change';
        else if (targetDoc.form === 'Armor') evolutionType = 'digi-egg';
      }

      // Find jogress partner if applicable
      let jogressPartner = null;
      if (evolutionType === 'jogress' && digimon.digivolutions?.jogress) {
        for (const j of digimon.digivolutions.jogress) {
          if (j.resultName === evo.name && j.partnerName) {
            const partnerDoc = nameToDoc.get(j.partnerName);
            if (partnerDoc) jogressPartner = partnerDoc.id;
          }
        }
      }

      try {
        const edgeData = {
          source: sourceId,
          target: targetId,
          evolutionType,
          requiredLevel: evo.requiredLevel || null,
          requiredItem: evo.requiredItem || null,
        };
        if (jogressPartner) edgeData.jogressPartner = jogressPartner;

        await payload.create({
          collection: 'evolution-edges',
          data: edgeData,
          overrideAccess: true,
        });

        existingEdges.add(edgeKey);
        created++;

        if (created % 50 === 0) {
          console.log(`  ... created ${created} edges so far`);
        }
      } catch (err) {
        errors++;
        console.error(`  ERROR creating edge ${digimon.name} -> ${evo.name}: ${err.message}`);
      }
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`Created: ${created}`);
  console.log(`Skipped (duplicates): ${skipped}`);
  console.log(`Errors: ${errors}`);

  // 6. Also populate evolution-lines from unique root Digimon
  console.log('\n=== Building Evolution Lines ===\n');

  // Group Digimon into evolution chains by walking backward to find roots
  const visited = new Set();
  const lines = [];

  // Build reverse lookup: name → Digimon that digivolvesTo that name
  const digivolvesFromName = new Map();
  for (const d of allDigimon) {
    for (const evo of (d.digivolutions?.digivolvesFrom || [])) {
      if (!evo.name) continue;
      const parentDoc = nameToDoc.get(evo.name);
      if (parentDoc) {
        if (!digivolvesFromName.has(d.name)) digivolvesFromName.set(d.name, []);
        digivolvesFromName.get(d.name).push(parentDoc);
      }
    }
  }

  // Find roots: Digimon with no digivolvesFrom
  for (const d of allDigimon) {
    const hasFrom = (d.digivolutions?.digivolvesFrom || []).length > 0;
    const hasTo = (d.digivolutions?.digivolvesTo || []).length > 0;
    if (!hasFrom && hasTo && !visited.has(d.slug)) {
      // This is a root — walk forward to collect the line
      const lineDigimon = [];
      const queue = [d];
      const lineVisited = new Set();

      while (queue.length > 0) {
        const current = queue.shift();
        if (lineVisited.has(current.slug)) continue;
        lineVisited.add(current.slug);
        visited.add(current.slug);
        lineDigimon.push(current.id);

        for (const evo of (current.digivolutions?.digivolvesTo || [])) {
          if (!evo.name) continue;
          const target = nameToDoc.get(evo.name);
          if (target && !lineVisited.has(target.slug)) {
            queue.push(target);
          }
        }
      }

      if (lineDigimon.length >= 2) {
        lines.push({
          name: `${d.name} Line`,
          rootDigimon: d.id,
          digimonInLine: lineDigimon,
          isPublic: true,
        });
      }
    }
  }

  // Check existing evolution-lines
  const existingLines = await payload.find({ collection: 'evolution-lines', limit: 0 });
  const existingLineNames = new Set();
  if (existingLines.totalDocs > 0) {
    let lPage = 1;
    while (true) {
      const lBatch = await payload.find({ collection: 'evolution-lines', limit: 100, page: lPage, depth: 0 });
      for (const l of lBatch.docs) existingLineNames.add(l.name);
      if (!lBatch.hasNextPage) break;
      lPage++;
    }
  }

  let linesCreated = 0;
  let linesSkipped = 0;
  for (const line of lines) {
    if (existingLineNames.has(line.name)) {
      linesSkipped++;
      continue;
    }
    try {
      await payload.create({
        collection: 'evolution-lines',
        data: line,
        overrideAccess: true,
      });
      linesCreated++;
      if (linesCreated % 20 === 0) console.log(`  ... created ${linesCreated} lines so far`);
    } catch (err) {
      console.error(`  ERROR creating line ${line.name}: ${err.message}`);
    }
  }

  console.log(`\nEvolution Lines Created: ${linesCreated}`);
  console.log(`Evolution Lines Skipped: ${linesSkipped}`);
  console.log(`\nDone! Check CMS admin.`);

  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
