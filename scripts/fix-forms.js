#!/usr/bin/env node
/**
 * Fix Digimon forms: map invalid forms to valid ones and update in CMS.
 * 
 * Valid forms (22):
 * In-Training, Rookie, Champion, Ultimate, Mega, Side Mega,
 * Burst Mode, Jogress, Armor,
 * Rookie X, Champion X, Ultimate X, Mega X, Burst Mode X, Jogress X,
 * H-Hybrid, B-Hybrid, O-Hybrid,
 * DigiXros, Double Xros, Great Xros, Variant
 */

const http = require('http');

const VALID_FORMS = new Set([
  'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega', 'Side Mega',
  'Burst Mode', 'Jogress', 'Armor',
  'Rookie X', 'Champion X', 'Ultimate X', 'Mega X',
  'Burst Mode X', 'Jogress X',
  'H-Hybrid', 'B-Hybrid', 'O-Hybrid',
  'DigiXros', 'Double Xros', 'Great Xros',
  'Variant',
]);

// Map invalid forms to the correct valid form
// Based on DMO Wiki data:
// - Z-Hybrid -> H-Hybrid (Z-Hybrid is a subcategory of Hybrid, mapped to H-Hybrid in DMO)
// - A-Hybrid -> H-Hybrid (same logic)
// - Fresh -> In-Training (Fresh is pre-In-Training, closest valid form)
// - Ultra -> Mega (Ultra is beyond Mega but closest valid)
// - Spirit -> H-Hybrid (Spirit forms are Hybrid types)
// - X-Antibody -> Mega X (X-Antibody Digimon are typically Mega X)
// - Jogress Mega -> Jogress (Jogress Mega is a Jogress variant)
// - De-Digivolve -> Rookie (De-Digivolve returns to lower form)
// - Mutant -> Variant (closest match)
// - Unknown -> Mega (default fallback, will check individual cases)
const FORM_MAP = {
  'Z-Hybrid': 'H-Hybrid',
  'A-Hybrid': 'H-Hybrid',
  'Fresh': 'In-Training',
  'Ultra': 'Mega',
  'Spirit': 'H-Hybrid',
  'X-Antibody': 'Mega X',
  'Jogress Mega': 'Jogress',
  'De-Digivolve': 'Rookie',
  'Mutant': 'Variant',
  'Unknown': 'Mega',
};

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'localhost', port: 3001, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'Authorization': 'JWT ' + token } : {}),
      },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch(e) { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  console.log('=== Fix Digimon Forms ===\n');

  // Login
  const login = await req('POST', '/api/users/login', { email: process.env.CMS_ADMIN_EMAIL, password: process.env.CMS_ADMIN_PASSWORD });
  const token = login.body.token;
  if (!token) { console.error('Login failed'); process.exit(1); }

  // Step 1: Audit all forms
  console.log('Auditing current forms...');
  const formCounts = {};
  const invalidDigimon = [];
  let page = 1;
  while (true) {
    const res = await req('GET', `/api/digimon?limit=100&page=${page}&depth=0`, null, token);
    for (const doc of res.body.docs || []) {
      const form = doc.form || 'MISSING';
      formCounts[form] = (formCounts[form] || 0) + 1;
      if (!VALID_FORMS.has(form)) {
        invalidDigimon.push({ id: doc.id, name: doc.name, form: form, slug: doc.slug });
      }
    }
    if (!res.body.hasNextPage) break;
    page++;
  }

  console.log('\nCurrent form distribution:');
  for (const [form, count] of Object.entries(formCounts).sort((a, b) => b[1] - a[1])) {
    const valid = VALID_FORMS.has(form) ? '✓' : '✗';
    console.log(`  ${valid} ${form}: ${count}`);
  }

  console.log(`\nDigimon with invalid forms: ${invalidDigimon.length}`);
  for (const d of invalidDigimon) {
    const newForm = FORM_MAP[d.form] || 'Mega';
    console.log(`  ${d.name.padEnd(35)} ${d.form.padEnd(15)} -> ${newForm}`);
  }

  if (process.argv.includes('--dry-run')) {
    console.log('\n(Dry run - no changes made)');
    return;
  }

  // Step 2: Fix invalid forms
  console.log('\nFixing invalid forms...');
  let fixed = 0, failed = 0;
  for (const d of invalidDigimon) {
    const newForm = FORM_MAP[d.form] || 'Mega';
    await new Promise(r => setTimeout(r, 200));
    const res = await req('PATCH', `/api/digimon/${d.id}`, { form: newForm }, token);
    if (res.status === 200 && res.body.doc) {
      fixed++;
    } else {
      failed++;
      console.error(`  FAILED ${d.name}: ${JSON.stringify(res.body).substring(0, 100)}`);
    }
  }

  console.log(`\nFixed: ${fixed}`);
  console.log(`Failed: ${failed}`);

  // Step 3: Verify
  console.log('\nVerifying...');
  const remaining = [];
  page = 1;
  while (true) {
    const res = await req('GET', `/api/digimon?limit=100&page=${page}&depth=0`, null, token);
    for (const doc of res.body.docs || []) {
      if (!VALID_FORMS.has(doc.form)) {
        remaining.push(`${doc.name}: ${doc.form}`);
      }
    }
    if (!res.body.hasNextPage) break;
    page++;
  }

  if (remaining.length === 0) {
    console.log('All Digimon now have valid forms!');
  } else {
    console.log(`Still invalid: ${remaining.length}`);
    remaining.forEach(r => console.log(`  ${r}`));
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
