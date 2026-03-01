async function main() {
  const CMS = 'http://localhost:3001';
  const PW = 'DmoKb_Alex2026!';

  const tests = [
    { label: 'Email (exact case)', email: 'alexhang@dmokb.info', password: PW },
    { label: 'Email (mixed case)', email: 'AlexHang@dmokb.info', password: PW },
    { label: 'Email (uppercase)', email: 'ALEXHANG@DMOKB.INFO', password: PW },
    { label: 'Username (exact)', email: 'alexhang', password: PW },
    { label: 'Username (mixed case)', email: 'AlexHang', password: PW },
    { label: 'Service (control)', email: 'service@dmokb.info', password: 'SvcFixRunner2026!' },
  ];

  for (const t of tests) {
    const r = await fetch(`${CMS}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: t.email, password: t.password }),
    });
    console.log(`${r.ok ? '✅' : '❌'} ${t.label.padEnd(25)} → ${r.status}`);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
