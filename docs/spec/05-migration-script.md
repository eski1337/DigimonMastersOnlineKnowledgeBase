# Part 5 — Migration Script

## Usage

```bash
# Dry run (no writes)
DRY_RUN=true npx ts-node scripts/migrate-evolution-edges.ts

# Live run
npx ts-node scripts/migrate-evolution-edges.ts
```

## Full Script

```ts
// scripts/migrate-evolution-edges.ts
import payload from 'payload';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DRY_RUN = process.env.DRY_RUN === 'true';

interface Stats {
  totalDigimon: number;
  edgesCreated: number;
  edgesSkippedDuplicate: number;
  edgesSkippedSelfLoop: number;
  edgesSkippedUnresolved: number;
  unresolvedNames: string[];
  errors: string[];
}

async function main() {
  await payload.init({
    secret: process.env.PAYLOAD_SECRET!,
    local: true,
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Evolution Edges Migration ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);
  console.log(`${'='.repeat(60)}\n`);

  const stats: Stats = {
    totalDigimon: 0, edgesCreated: 0, edgesSkippedDuplicate: 0,
    edgesSkippedSelfLoop: 0, edgesSkippedUnresolved: 0,
    unresolvedNames: [], errors: [],
  };

  // ── 1. Load all Digimon ───────────────────────────────────
  console.log('[1/4] Loading all Digimon...');
  const allDigimon: any[] = [];
  let page = 1;
  while (true) {
    const batch = await payload.find({ collection: 'digimon', limit: 100, page, depth: 0 });
    allDigimon.push(...batch.docs);
    if (!batch.hasNextPage) break;
    page++;
  }
  stats.totalDigimon = allDigimon.length;
  console.log(`  Found ${allDigimon.length} Digimon.`);

  // ── 2. Build name → ID lookup ────────────────────────────
  console.log('[2/4] Building name → ID index...');
  const nameToId = new Map<string, string>();
  for (const d of allDigimon) {
    nameToId.set(d.name, String(d.id));
    // Also index without parenthetical suffixes
    const baseName = d.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (baseName !== d.name && !nameToId.has(baseName)) {
      nameToId.set(baseName, String(d.id));
    }
  }
  console.log(`  Indexed ${nameToId.size} name variants.`);

  // ── 3. Dedup tracker ─────────────────────────────────────
  const created = new Set<string>();
  const key = (s: string, t: string, typ: string) => `${s}|${t}|${typ}`;

  // ── 4. Create edges ──────────────────────────────────────
  console.log('[3/4] Creating evolution edges...');

  for (const d of allDigimon) {
    const sourceId = String(d.id);
    const dv = d.digivolutions;
    if (!dv) continue;

    // digivolvesTo → forward edges
    for (const evo of (dv.digivolvesTo || [])) {
      if (!evo.name) continue;
      const targetId = nameToId.get(evo.name);
      if (!targetId) {
        stats.edgesSkippedUnresolved++;
        if (!stats.unresolvedNames.includes(evo.name)) stats.unresolvedNames.push(evo.name);
        continue;
      }
      if (sourceId === targetId) { stats.edgesSkippedSelfLoop++; continue; }

      const k = key(sourceId, targetId, 'normal');
      if (created.has(k)) { stats.edgesSkippedDuplicate++; continue; }
      created.add(k);

      if (!DRY_RUN) {
        try {
          await payload.create({
            collection: 'evolution-edges',
            data: {
              source: sourceId,
              target: targetId,
              evolutionType: 'normal',
              requiredLevel: evo.requiredLevel || null,
              requiredItem: evo.requiredItem || null,
            },
          });
        } catch (e: any) {
          if (e.message?.includes('Duplicate')) { stats.edgesSkippedDuplicate++; continue; }
          stats.errors.push(`${d.name} → ${evo.name}: ${e.message}`);
          continue;
        }
      }
      stats.edgesCreated++;
    }

    // digivolvesFrom → backward edges (only if not already created from other side)
    for (const evo of (dv.digivolvesFrom || [])) {
      if (!evo.name) continue;
      const prevId = nameToId.get(evo.name);
      if (!prevId) {
        stats.edgesSkippedUnresolved++;
        if (!stats.unresolvedNames.includes(evo.name)) stats.unresolvedNames.push(evo.name);
        continue;
      }
      if (prevId === sourceId) { stats.edgesSkippedSelfLoop++; continue; }

      const k = key(prevId, sourceId, 'normal');
      if (created.has(k)) { stats.edgesSkippedDuplicate++; continue; }
      created.add(k);

      // Find requiredLevel/Item from the other Digimon's digivolvesTo
      const prevDoc = allDigimon.find((dd: any) => String(dd.id) === prevId);
      const match = prevDoc?.digivolutions?.digivolvesTo?.find((e: any) => e.name === d.name);

      if (!DRY_RUN) {
        try {
          await payload.create({
            collection: 'evolution-edges',
            data: {
              source: prevId,
              target: sourceId,
              evolutionType: 'normal',
              requiredLevel: match?.requiredLevel || null,
              requiredItem: match?.requiredItem || null,
            },
          });
        } catch (e: any) {
          if (e.message?.includes('Duplicate')) { stats.edgesSkippedDuplicate++; continue; }
          stats.errors.push(`${evo.name} → ${d.name}: ${e.message}`);
          continue;
        }
      }
      stats.edgesCreated++;
    }

    // jogress entries
    for (const jog of (dv.jogress || [])) {
      const partnerId = typeof jog.partner === 'string' ? jog.partner : jog.partner?.id;
      const resultId = typeof jog.result === 'string' ? jog.result : jog.result?.id;
      if (!partnerId || !resultId) continue;

      const k = key(sourceId, String(resultId), 'jogress');
      if (created.has(k)) { stats.edgesSkippedDuplicate++; continue; }
      created.add(k);

      if (!DRY_RUN) {
        try {
          await payload.create({
            collection: 'evolution-edges',
            data: {
              source: sourceId,
              target: String(resultId),
              evolutionType: 'jogress',
              jogressPartner: String(partnerId),
            },
          });
        } catch (e: any) {
          if (e.message?.includes('Duplicate')) { stats.edgesSkippedDuplicate++; continue; }
          stats.errors.push(`Jogress ${d.name}: ${e.message}`);
          continue;
        }
      }
      stats.edgesCreated++;
    }
  }

  // ── 5. Report ────────────────────────────────────────────
  console.log('\n[4/4] Done.\n');
  console.log(`${'─'.repeat(50)}`);
  console.log(`  Digimon processed:     ${stats.totalDigimon}`);
  console.log(`  Edges created:         ${stats.edgesCreated}`);
  console.log(`  Skipped (duplicate):   ${stats.edgesSkippedDuplicate}`);
  console.log(`  Skipped (self-loop):   ${stats.edgesSkippedSelfLoop}`);
  console.log(`  Skipped (unresolved):  ${stats.edgesSkippedUnresolved}`);
  console.log(`  Errors:                ${stats.errors.length}`);
  console.log(`${'─'.repeat(50)}`);

  if (stats.unresolvedNames.length > 0) {
    console.log(`\n  Unresolved names (${stats.unresolvedNames.length}):`);
    for (const n of stats.unresolvedNames.slice(0, 50)) console.log(`    - "${n}"`);
    if (stats.unresolvedNames.length > 50) console.log(`    ... and ${stats.unresolvedNames.length - 50} more`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n  Errors:`);
    for (const e of stats.errors.slice(0, 20)) console.log(`    ✗ ${e}`);
  }

  if (DRY_RUN) console.log('\n  ⚠ DRY RUN — no data written. Remove DRY_RUN=true to execute.\n');

  process.exit(0);
}

main().catch((e) => { console.error('Migration failed:', e); process.exit(1); });
```

## Data Flow

```
For each Digimon doc:
  1. digivolvesTo[] → creates FORWARD edge (this → target, type=normal)
     - requiredLevel and requiredItem come from the digivolvesTo entry
  2. digivolvesFrom[] → creates BACKWARD edge (prev → this, type=normal)
     - requiredLevel/Item looked up from prev's digivolvesTo matching this name
     - Dedup key prevents creating the same edge twice from both sides
  3. jogress[] → creates JOGRESS edge (this → result, type=jogress, jogressPartner=partner)
```

## Edge Case Handling

- **Name not found**: logged to `unresolvedNames`, skipped (no edge created)
- **Self-loop**: `source === target` → skipped, counted
- **Duplicate**: checked via in-memory `Set<string>` + DB unique index as fallback
- **Bidirectional data**: both A.digivolvesTo includes B AND B.digivolvesFrom includes A → dedup key ensures single edge
- **Jogress partner is relationship ID** (not name) → resolved directly
