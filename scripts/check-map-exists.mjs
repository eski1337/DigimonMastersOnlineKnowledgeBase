const CMS = 'http://localhost:3001';
const slug = process.argv[2] || 'ancient-ruins-of-secret';
async function main() {
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=${slug}&limit=1`);
  const data = await res.json();
  console.log(`slug="${slug}" totalDocs=${data.totalDocs}`);
  if (data.docs?.[0]) console.log('id:', data.docs[0].id, 'name:', data.docs[0].name);
}
main().catch(console.error);
