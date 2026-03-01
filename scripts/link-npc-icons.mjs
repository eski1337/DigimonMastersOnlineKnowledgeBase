// Link NPC icons: match NPC names to existing media and set the icon field
const CMS = 'http://localhost:3001';

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  return (await res.json()).token;
}

// Build a lookup of all media files containing "Icon" in the filename
async function buildMediaIndex(token) {
  const index = new Map(); // lowercase key → { id, filename, url }
  let page = 1;
  while (true) {
    const res = await fetch(
      `${CMS}/api/media?where[filename][contains]=Icon&limit=100&page=${page}&sort=filename`,
      { headers: { Authorization: `JWT ${token}` } },
    );
    const data = await res.json();
    for (const m of data.docs || []) {
      // Index by normalized filename (lowercase, no extension, no -1/-2 suffix)
      const base = m.filename.replace(/\.\w+$/, '').replace(/-\d+$/, '').toLowerCase();
      if (!index.has(base)) index.set(base, m);
    }
    if (!data.hasNextPage) break;
    page++;
  }
  console.log(`Media index: ${index.size} unique icon entries`);
  return index;
}

// Generate candidate lookup keys for an NPC name
function candidateKeys(name) {
  // Clean name: strip (NPC), (Digicore Merchant), etc. suffixes for matching
  const baseName = name.replace(/\s*\([^)]*\)\s*/g, '').trim();
  const underscore = baseName.replace(/['']/g, '').replace(/\s+/g, '_');
  const underscoreFull = name.replace(/['']/g, '').replace(/\s+/g, '_').replace(/[()]/g, '');

  const keys = [
    // Exact name_Search_Icon
    `${underscore}_search_icon`,
    // Exact name_Icon
    `${underscore}_icon`,
    // Full name with suffix_Search_Icon
    `${underscoreFull}_search_icon`,
    `${underscoreFull}_icon`,
    // Try without apostrophes and special chars
    `${underscore.replace(/[^a-z0-9_]/gi, '')}_search_icon`,
    `${underscore.replace(/[^a-z0-9_]/gi, '')}_icon`,
  ];

  return [...new Set(keys.map(k => k.toLowerCase()))];
}

async function main() {
  const token = await login();
  if (!token) { console.error('Login failed'); process.exit(1); }

  const mediaIndex = await buildMediaIndex(token);

  // Process all maps
  let page = 1;
  let totalLinked = 0;
  let totalMaps = 0;

  while (true) {
    const res = await fetch(`${CMS}/api/maps?limit=50&page=${page}&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const data = await res.json();
    if ((data.docs || []).length === 0) break;

    for (const map of data.docs) {
      const npcs = map.npcs || [];
      if (npcs.length === 0) continue;

      let changed = false;
      const updatedNpcs = npcs.map(npc => {
        // Skip if already has an icon
        if (npc.icon) return npc;

        const keys = candidateKeys(npc.name);
        let match = null;
        for (const key of keys) {
          if (mediaIndex.has(key)) {
            match = mediaIndex.get(key);
            break;
          }
        }

        // Fallback: fuzzy substring search in media index
        if (!match) {
          const nameNorm = npc.name.replace(/\s*\([^)]*\)/g, '').trim().replace(/['']/g, '').replace(/\s+/g, '_').toLowerCase();
          for (const [key, media] of mediaIndex) {
            if (key.includes(nameNorm) && (key.includes('_icon') || key.includes('_search_icon'))) {
              match = media;
              break;
            }
          }
        }

        if (match) {
          changed = true;
          console.log(`  [${map.slug}] ${npc.name} → ${match.filename}`);
          return { ...npc, icon: match.id };
        }
        return npc;
      });

      if (changed) {
        const patchRes = await fetch(`${CMS}/api/maps/${map.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
          body: JSON.stringify({ npcs: updatedNpcs }),
        });
        if (patchRes.ok) {
          totalMaps++;
          totalLinked += updatedNpcs.filter((n, i) => n.icon && !npcs[i].icon).length;
        } else {
          console.error(`  PATCH failed for ${map.slug}: ${patchRes.status}`);
        }
      }
    }

    if (!data.hasNextPage) break;
    page++;
  }

  console.log(`\nDone. Linked ${totalLinked} NPC icons across ${totalMaps} maps.`);

  // Report unmatched NPCs
  page = 1;
  const unmatched = [];
  while (true) {
    const res = await fetch(`${CMS}/api/maps?limit=50&page=${page}&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const data = await res.json();
    if ((data.docs || []).length === 0) break;
    for (const map of data.docs) {
      for (const npc of (map.npcs || [])) {
        if (!npc.icon) unmatched.push(`[${map.slug}] ${npc.name}`);
      }
    }
    if (!data.hasNextPage) break;
    page++;
  }
  if (unmatched.length > 0) {
    console.log(`\n${unmatched.length} NPCs still without icons:`);
    unmatched.forEach(u => console.log(`  ${u}`));
  }
}

main().catch(console.error);
