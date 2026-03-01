// Diagnose image loading issues on map pages
const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';

async function main() {
  // 1. Check what the CMS returns for a map with known images
  const res = await fetch(`${CMS}/api/maps?where[slug][equals]=file-island-waterfront&depth=1&limit=1`);
  const map = (await res.json()).docs?.[0];
  if (!map) { console.log('Map not found'); return; }

  console.log('=== Image fields ===');
  console.log('image:', JSON.stringify(map.image)?.slice(0, 300));
  console.log('mapImage:', JSON.stringify(map.mapImage)?.slice(0, 300));
  console.log('gallery:', JSON.stringify(map.gallery)?.slice(0, 300));
  
  // Check NPC icons
  const npcsWithIcons = (map.npcs || []).filter(n => n.icon);
  console.log('\n=== NPC icons ===');
  console.log(`NPCs with icons: ${npcsWithIcons.length}/${(map.npcs || []).length}`);
  if (npcsWithIcons.length > 0) {
    console.log('Sample NPC icon:', JSON.stringify(npcsWithIcons[0].icon)?.slice(0, 300));
  }

  // 2. Check if CMS media endpoint works
  const mediaRes = await fetch(`${CMS}/api/media?limit=3`);
  const mediaData = await mediaRes.json();
  console.log('\n=== Media endpoint ===');
  console.log('Media count:', mediaData.totalDocs);
  if (mediaData.docs?.[0]) {
    console.log('Sample media URL:', mediaData.docs[0].url);
    console.log('Sample media filename:', mediaData.docs[0].filename);
  }

  // 3. Check if a sample image URL is actually accessible
  if (mediaData.docs?.[0]?.url) {
    const url = mediaData.docs[0].url;
    const fullUrl = url.startsWith('http') ? url : `${CMS}${url}`;
    try {
      const imgRes = await fetch(fullUrl, { method: 'HEAD' });
      console.log(`\nImage fetch test (${fullUrl}): ${imgRes.status}`);
    } catch (e) {
      console.log(`\nImage fetch test FAILED: ${e.message}`);
    }
  }

  // 4. Check what NEXT_PUBLIC_CMS_URL resolves to on the web side
  console.log('\n=== Environment ===');
  console.log('CMS_INTERNAL_URL:', process.env.CMS_INTERNAL_URL || '(not set)');
  console.log('NEXT_PUBLIC_CMS_URL:', process.env.NEXT_PUBLIC_CMS_URL || '(not set)');

  // 5. Check next.config for image domains
  const fs = await import('fs');
  const path = await import('path');
  const nextConfigPath = path.resolve(process.cwd(), 'apps/web/next.config.mjs');
  if (fs.existsSync(nextConfigPath)) {
    const config = fs.readFileSync(nextConfigPath, 'utf8');
    const domainMatch = config.match(/domains|remotePatterns|images/gi);
    console.log('\n=== next.config.mjs image config ===');
    // Extract the images section
    const imagesMatch = config.match(/images\s*:\s*\{[\s\S]*?\}/);
    if (imagesMatch) {
      console.log(imagesMatch[0]);
    } else {
      console.log('No images config found in next.config.mjs');
    }
  } else {
    console.log('\nnext.config.mjs not found at', nextConfigPath);
    // Try .js
    const jsPath = nextConfigPath.replace('.mjs', '.js');
    if (fs.existsSync(jsPath)) {
      const config = fs.readFileSync(jsPath, 'utf8');
      const imagesMatch = config.match(/images[\s\S]*?(?:\}[\s\S]*?\}|\})/);
      console.log('\n=== next.config.js image config ===');
      console.log(imagesMatch?.[0] || 'No images config found');
    }
  }

  // 6. Check Digimon icons
  const digiRes = await fetch(`${CMS}/api/digimon?limit=5&depth=1`);
  const digiData = await digiRes.json();
  console.log('\n=== Digimon icons ===');
  for (const d of (digiData.docs || []).slice(0, 3)) {
    const mainImg = d.mainImage;
    console.log(`${d.name}: mainImage=${typeof mainImg === 'object' ? mainImg?.url : mainImg}`);
  }
}

main().catch(console.error);
