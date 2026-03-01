// Clean up HTML tags and entities from NPC names and roles across all maps
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';

function decodeEntities(str) {
  if (!str) return str;
  return str
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function stripHtml(str) {
  if (!str) return str;
  // Remove full HTML tags (including anchor tags with attributes)
  return str.replace(/<[^>]+>/g, '').trim();
}

function cleanNpcField(val) {
  if (!val || typeof val !== 'string') return val;
  let cleaned = decodeEntities(val);
  cleaned = stripHtml(cleaned);
  // Remove surrounding angle brackets if the whole thing was wrapped: <<...>>
  cleaned = cleaned.replace(/^<<(.+)>>$/, '$1').trim();
  // Remove surrounding angle brackets for roles: <...>
  cleaned = cleaned.replace(/^<(.+)>$/, '$1').trim();
  return cleaned;
}

async function main() {
  // Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();
  if (!token) { console.error('Login failed'); process.exit(1); }

  // Fetch all maps
  let page = 1;
  let totalFixed = 0;
  let totalMapsFixed = 0;

  while (true) {
    const res = await fetch(`${CMS}/api/maps?limit=50&page=${page}&depth=0`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const data = await res.json();
    const maps = data.docs || [];
    if (maps.length === 0) break;

    for (const map of maps) {
      const npcs = map.npcs || [];
      if (npcs.length === 0) continue;

      let changed = false;
      const cleanedNpcs = npcs.map(npc => {
        const newName = cleanNpcField(npc.name);
        const newRole = cleanNpcField(npc.role);

        if (newName !== npc.name || newRole !== npc.role) {
          changed = true;
          if (newName !== npc.name) console.log(`  [${map.slug}] name: "${npc.name}" → "${newName}"`);
          if (newRole !== npc.role) console.log(`  [${map.slug}] role: "${npc.role}" → "${newRole}"`);
        }

        return { ...npc, name: newName, role: newRole };
      });

      if (changed) {
        const patchRes = await fetch(`${CMS}/api/maps/${map.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
          body: JSON.stringify({ npcs: cleanedNpcs }),
        });
        if (patchRes.ok) {
          totalMapsFixed++;
          totalFixed += cleanedNpcs.filter((n, i) => n.name !== npcs[i].name || n.role !== npcs[i].role).length;
        } else {
          console.error(`  PATCH failed for ${map.slug}: ${patchRes.status}`);
        }
      }
    }

    if (!data.hasNextPage) break;
    page++;
  }

  console.log(`\nDone. Fixed ${totalFixed} NPC entries across ${totalMapsFixed} maps.`);
}

main().catch(console.error);
