// Link AlexHang@dmokb.info to Alex's CMS account
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';

async function main() {
  // Login as service account
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  if (!loginRes.ok) { console.error('Login failed'); process.exit(1); }
  const { token } = await loginRes.json();

  // Find Alex's account
  const findRes = await fetch(`${CMS}/api/users?where[email][equals]=alex.hang.use@protonmail.com&limit=1`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const findData = await findRes.json();
  const alex = findData.docs?.[0];

  if (!alex) {
    console.log('Alex not found by protonmail. Trying by username...');
    const findRes2 = await fetch(`${CMS}/api/users?where[username][equals]=AlexHang&limit=1`, {
      headers: { Authorization: `JWT ${token}` },
    });
    const findData2 = await findRes2.json();
    if (!findData2.docs?.[0]) { console.error('Alex not found'); process.exit(1); }
  }

  const alexId = alex?.id || findData.docs?.[0]?.id;
  console.log(`Found Alex: id=${alexId}, email=${alex?.email}, name=${alex?.name}`);

  // Update email to new @dmokb.info address
  const patchRes = await fetch(`${CMS}/api/users/${alexId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify({ email: 'AlexHang@dmokb.info' }),
  });

  if (patchRes.ok) {
    console.log('✓ Updated Alex email to AlexHang@dmokb.info');
  } else {
    const err = await patchRes.text();
    console.log('Failed to update email:', patchRes.status, err.slice(0, 200));
  }
}

main().catch(console.error);
