// Verify security fixes
const CMS = 'http://localhost:3001';

// Test 1: Unauthenticated user API should not expose emails
const r1 = await fetch(`${CMS}/api/users?limit=2&depth=0`);
const d1 = await r1.json();
console.log('=== Test 1: Unauthenticated Users API ===');
for (const u of d1.docs) {
  console.log(`  ${u.name || u.username}: email=${u.email || 'HIDDEN'}, discordId=${u.discordId || 'HIDDEN'}, role=${u.role}`);
}
const hasLeakedEmail = d1.docs.some(u => u.email);
console.log(hasLeakedEmail ? '❌ FAIL: Emails still exposed!' : '✅ PASS: Emails hidden from public');

// Test 2: Authenticated admin should still see emails
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASSWORD = process.env.CMS_ADMIN_PASSWORD;
const loginR = await fetch(`${CMS}/api/users/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:EMAIL,password:PASSWORD}) });
const loginD = await loginR.json();
const token = loginD.token;
console.log('\n=== Test 2: Authenticated Admin Users API ===');
if (token) {
  const r2 = await fetch(`${CMS}/api/users?limit=2&depth=0`, { headers:{Authorization:`JWT ${token}`} });
  const d2 = await r2.json();
  for (const u of d2.docs) {
    console.log(`  ${u.name || u.username}: email=${u.email || 'MISSING'}, role=${u.role}`);
  }
  const adminSeesEmail = d2.docs.some(u => u.email);
  console.log(adminSeesEmail ? '✅ PASS: Admin can see emails' : '❌ FAIL: Admin cannot see emails');
} else {
  console.log('❌ Could not login as admin');
}

// Test 3: Check security headers on web
const r3 = await fetch('http://localhost:3000/', { redirect: 'manual' });
console.log('\n=== Test 3: Security Headers ===');
for (const h of ['x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) {
  const v = r3.headers.get(h);
  console.log(`  ${h}: ${v || 'MISSING'} ${v ? '✅' : '❌'}`);
}
