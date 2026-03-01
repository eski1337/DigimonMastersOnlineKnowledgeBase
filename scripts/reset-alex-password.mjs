const CMS = 'http://localhost:3001';
const NEW_PASSWORD = 'DmoKb_Alex2026!';

// Login as admin
const loginRes = await fetch(`${CMS}/api/users/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
});
const { token } = await loginRes.json();
if (!token) { console.error('Admin login failed'); process.exit(1); }

// Reset password via PATCH
const res = await fetch(`${CMS}/api/users/699ce7a98159f1adefea9813`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `JWT ${token}`,
  },
  body: JSON.stringify({ password: NEW_PASSWORD }),
});

const data = await res.json();
if (res.ok) {
  console.log('Password reset successfully for:', data.doc?.email || data.doc?.username);
  console.log('New password:', NEW_PASSWORD);
  
  // Verify login with email
  const emailLogin = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'AlexHang@dmokb.info', password: NEW_PASSWORD }),
  });
  console.log('Login with email:', emailLogin.ok ? 'SUCCESS' : 'FAILED');

  // Verify login with username
  const usernameLogin = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alexhang', password: NEW_PASSWORD }),
  });
  console.log('Login with username:', usernameLogin.ok ? 'SUCCESS' : 'FAILED');
} else {
  console.error('Password reset FAILED:', JSON.stringify(data, null, 2));
}
