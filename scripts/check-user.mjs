const CMS = 'http://localhost:3001';

// Login as admin
const loginRes = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
});
const loginData = await loginRes.json();
const token = loginData.token;
if (!token) { console.error('Admin login failed:', loginData); process.exit(1); }

// Fetch user by username
const res = await fetch(`${CMS}/api/users?where[username][equals]=alexhang&limit=1`, {
  headers: { Authorization: `JWT ${token}` },
});
const data = await res.json();
const user = data.docs?.[0];
if (!user) { console.log('User not found'); process.exit(1); }

console.log('User found:');
console.log('  id:', user.id);
console.log('  email:', user.email);
console.log('  username:', user.username);
console.log('  displayName:', user.displayName);
console.log('  role:', user.role);
console.log('  emailVerified:', user.emailVerified);
console.log('  loginAttempts:', user.loginAttempts);
console.log('  lockUntil:', user.lockUntil);
console.log('  _verified:', user._verified);
console.log('  createdAt:', user.createdAt);
console.log('  updatedAt:', user.updatedAt);
