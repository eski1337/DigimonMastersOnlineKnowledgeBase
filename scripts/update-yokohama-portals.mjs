#!/usr/bin/env node
/**
 * Populates portal connections for Yokohama Village area maps.
 */
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
let TOKEN = '';

async function login() {
  const res = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const data = await res.json();
  TOKEN = data.token;
  console.log('Logged in');
}

async function getMapBySlug(slug) {
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1`, {
    headers: { Authorization: `JWT ${TOKEN}` },
  });
  const data = await res.json();
  return data.docs?.[0] || null;
}

async function updateMap(id, payload) {
  const res = await fetch(`${CMS}/api/maps/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
    body: JSON.stringify(payload),
  });
  return res.ok;
}

// Portal connections for Yokohama Village area
const PORTAL_DATA = {
  'yokohama-village': [
    { destination: 'Yokohama East Village', destinationSlug: 'yokohama-east-village' },
    { destination: 'Oil Refinery 1', destinationSlug: 'oil-refinery-1' },
    { destination: 'DATS Center', destinationSlug: 'dats-center' },
  ],
  'yokohama-east-village': [
    { destination: 'Yokohama Village', destinationSlug: 'yokohama-village' },
  ],
  'oil-refinery-1': [
    { destination: 'Yokohama Village', destinationSlug: 'yokohama-village' },
    { destination: 'Oil Refinery 2', destinationSlug: 'oil-refinery-2' },
  ],
  'oil-refinery-2': [
    { destination: 'Oil Refinery 1', destinationSlug: 'oil-refinery-1' },
    { destination: 'Oil Refinery 3', destinationSlug: 'oil-refinery-3' },
  ],
  'oil-refinery-3': [
    { destination: 'Oil Refinery 2', destinationSlug: 'oil-refinery-2' },
  ],
};

async function main() {
  await login();

  for (const [slug, portals] of Object.entries(PORTAL_DATA)) {
    const map = await getMapBySlug(slug);
    if (!map) { console.error(`Not found: ${slug}`); continue; }
    console.log(`Updating portals for ${slug} (${portals.length} connections)...`);
    const ok = await updateMap(map.id, { portals });
    console.log(ok ? `  ✅ ${slug}` : `  ❌ ${slug}`);
  }

  console.log('\n🎉 Done!');
}

main().catch(console.error);
