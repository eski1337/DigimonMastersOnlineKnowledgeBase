const CMS = 'http://localhost:3001';
const NEW_PASSWORD = 'DmoKb_Alex2026!';

// 1. Verify admin login still works
console.log('=== Step 1: Admin login ===');
const adminRes = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
});
const adminData = await adminRes.json();
console.log('Admin login:', adminRes.ok ? 'OK' : 'FAILED');
const token = adminData.token;

// 2. Check user state
console.log('\n=== Step 2: User state ===');
const userRes = await fetch(`${CMS}/api/users/699ce7a98159f1adefea9813?depth=0`, {
  headers: { 'Authorization': `JWT ${token}` },
});
const userData = await userRes.json();
console.log('email:', userData.email);
console.log('username:', userData.username);
console.log('role:', userData.role);
console.log('_verified:', userData._verified);
console.log('loginAttempts:', userData.loginAttempts);
console.log('lockUntil:', userData.lockUntil);
console.log('hash exists:', !!userData.hash);
console.log('salt exists:', !!userData.salt);

// 3. Try login with email directly
console.log('\n=== Step 3: Login with email ===');
const emailRes = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: NEW_PASSWORD }),
});
const emailData = await emailRes.json();
console.log('Status:', emailRes.status);
console.log('Response:', JSON.stringify(emailData).substring(0, 300));

// 4. Try login with lowercase email
console.log('\n=== Step 4: Login with lowercase email ===');
const lcRes = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'alexhang@dmokb.info', password: NEW_PASSWORD }),
});
const lcData = await lcRes.json();
console.log('Status:', lcRes.status);
console.log('Response:', JSON.stringify(lcData).substring(0, 300));

// 5. Try unlock first, then reset password again
console.log('\n=== Step 5: Unlock + reset ===');
const unlockRes = await fetch(`${CMS}/api/users/unlock`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `JWT ${token}`,
  },
  body: JSON.stringify({ email: 'AlexHang@dmokb.info' }),
});
console.log('Unlock status:', unlockRes.status);

// Reset with explicit fields
const resetRes = await fetch(`${CMS}/api/users/699ce7a98159f1adefea9813`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `JWT ${token}`,
  },
  body: JSON.stringify({
    password: NEW_PASSWORD,
    loginAttempts: 0,
    lockUntil: null,
  }),
});
console.log('Reset status:', resetRes.status);
const resetData = await resetRes.json();
console.log('Reset response:', JSON.stringify(resetData).substring(0, 200));

// 6. Final login attempt
console.log('\n=== Step 6: Final login attempt ===');
const finalRes = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: NEW_PASSWORD }),
});
const finalData = await finalRes.json();
console.log('Status:', finalRes.status);
console.log('Has token:', !!finalData.token);
console.log('Response:', JSON.stringify(finalData).substring(0, 300));
