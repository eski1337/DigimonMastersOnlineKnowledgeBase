const http = require('http');
const https = require('https');

function fetch(url, opts = {}) {
  const mod = url.startsWith('https') ? https : http;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (url.startsWith('https') ? 443 : 80),
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };
    const req = mod.request(reqOpts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

(async () => {
  const results = [];
  const check = (name, ok, detail) => {
    results.push({ name, ok, detail });
    console.log(`${ok ? '✅' : '❌'} ${name}: ${detail}`);
  };

  // 1. Homepage
  try {
    const r = await fetch('https://dmokb.info');
    check('Homepage', r.status === 200, `HTTP ${r.status}`);
  } catch (e) { check('Homepage', false, e.message); }

  // 2. Digimon page
  try {
    const r = await fetch('https://dmokb.info/digimon');
    check('Digimon Page', r.status === 200, `HTTP ${r.status}`);
  } catch (e) { check('Digimon Page', false, e.message); }

  // 3. Digimon API with images
  try {
    const r = await fetch('https://dmokb.info/api/digimon?limit=1000');
    const d = JSON.parse(r.body);
    let pop = 0;
    d.docs.forEach(x => { if (typeof x.mainImage === 'object' && x.mainImage?.url) pop++; });
    check('Digimon API + Images', d.docs.length > 0 && pop > 0, `${d.docs.length} total, ${pop} with images`);
  } catch (e) { check('Digimon API + Images', false, e.message); }

  // 4. CMS Admin
  try {
    const r = await fetch('https://cms.dmokb.info/admin');
    const hasCms = r.body.includes('cms.dmokb.info') || r.status === 200;
    check('CMS Admin Panel', r.status === 200, `HTTP ${r.status}`);
  } catch (e) { check('CMS Admin Panel', false, e.message); }

  // 5. CMS API
  try {
    const r = await fetch('https://cms.dmokb.info/api/digimon?limit=1&depth=1');
    const d = JSON.parse(r.body);
    check('CMS API', d.totalDocs > 0, `${d.totalDocs} docs`);
  } catch (e) { check('CMS API', false, e.message); }

  // 6. CMS Media
  try {
    const r = await fetch('https://cms.dmokb.info/media/Agumon-1.png');
    const isImg = r.headers['content-type']?.startsWith('image/');
    check('CMS Media Files', r.status === 200 && isImg, `HTTP ${r.status}, type: ${r.headers['content-type']}`);
  } catch (e) { check('CMS Media Files', false, e.message); }

  // 7. Auth Providers
  try {
    const r = await fetch('https://dmokb.info/api/auth/providers');
    const d = JSON.parse(r.body);
    const providers = Object.keys(d);
    check('Auth Providers', providers.includes('credentials'), `Providers: ${providers.join(', ')}`);
  } catch (e) { check('Auth Providers', false, e.message); }

  // 8. CMS Owner Login
  try {
    const r = await fetch('http://localhost:3001/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: process.env.CMS_ADMIN_EMAIL, password: process.env.CMS_ADMIN_PASSWORD }),
    });
    check('CMS Owner Login', r.status === 200, `HTTP ${r.status}`);
  } catch (e) { check('CMS Owner Login', false, e.message); }

  // 9. Registration
  try {
    const r = await fetch('http://localhost:3001/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'e2etest@dmokb.info', password: 'E2ETest2026!', username: 'e2etest' }),
    });
    check('User Registration', r.status === 201 || r.status === 400, `HTTP ${r.status}`);
  } catch (e) { check('User Registration', false, e.message); }

  // 10. Mailcow Web UI
  try {
    const r = await fetch('https://mail.dmokb.info');
    check('Mailcow Web UI', r.status === 200 || r.status === 301 || r.status === 302, `HTTP ${r.status}`);
  } catch (e) { check('Mailcow Web UI', false, e.message); }

  // 11. Patch Notes API
  try {
    const r = await fetch('http://localhost:3001/api/patchnotes?limit=1');
    const d = JSON.parse(r.body);
    check('Patch Notes API', r.status === 200, `HTTP ${r.status}, ${d.totalDocs} docs`);
  } catch (e) { check('Patch Notes API', false, e.message); }

  // Summary
  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed out of ${results.length} checks`);
  if (failed > 0) {
    console.log('\nFailed checks:');
    results.filter(r => !r.ok).forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
  }
})();
