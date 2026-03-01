async function main() {
  const CMS = 'http://localhost:3001';
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'service@dmokb.info', password: 'SvcFixRunner2026!' }),
  });
  const { token } = await loginRes.json();
  const headers = { Authorization: `JWT ${token}`, 'Content-Type': 'application/json' };

  // Find "Shinjuku Park" loading screen image in media
  const mediaRes = await fetch(`${CMS}/api/media?where[filename][like]=ShinjukuPark&limit=10`, { headers });
  const mediaData = await mediaRes.json();
  console.log('Media matching ShinjukuPark:');
  for (const m of mediaData.docs) {
    console.log(`  ${m.filename} -> ${m.id}`);
  }

  // Also search more broadly
  const mediaRes2 = await fetch(`${CMS}/api/media?where[filename][like]=Shinjuku&limit=20`, { headers });
  const md2 = await mediaRes2.json();
  console.log('\nAll Shinjuku media:');
  for (const m of md2.docs) {
    console.log(`  ${m.filename} -> ${m.id}`);
  }

  // Find the Shinjuku Park map (no D-Reaper suffix)
  const mapRes = await fetch(`${CMS}/api/maps?where[name][equals]=Shinjuku Park&where[area][equals]=shinjuku-d-reaper&limit=1`, { headers });
  const mapData = await mapRes.json();
  if (mapData.docs.length > 0) {
    const map = mapData.docs[0];
    console.log('\nMap:', map.name, 'id:', map.id, 'image:', map.image || 'NONE');
    
    // Try to find a generic Shinjuku Park loading screen
    const parkMedia = md2.docs.find(m => 
      m.filename.includes('ShinjukuPark') && !m.filename.includes('D-Reaper')
    );
    if (parkMedia) {
      console.log('Found matching media:', parkMedia.filename, parkMedia.id);
      // Link it
      const patchRes = await fetch(`${CMS}/api/maps/${map.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ image: parkMedia.id }),
      });
      console.log('Linked:', patchRes.ok ? 'OK' : 'FAILED');
    } else {
      console.log('No matching Shinjuku Park image found (non D-Reaper)');
      // Use the D-Reaper one as fallback
      const drPark = md2.docs.find(m => m.filename.includes('ShinjukuPark'));
      if (drPark) {
        console.log('Using D-Reaper variant:', drPark.filename);
        const patchRes = await fetch(`${CMS}/api/maps/${map.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ image: drPark.id }),
        });
        console.log('Linked:', patchRes.ok ? 'OK' : 'FAILED');
      }
    }
  }
}
main().catch(console.error);
