const http = require('http');
function get(path){return new Promise((res,rej)=>{http.get('http://localhost:3001'+path,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){res(d)}})}).on('error',rej)})}
const fs = require('fs');
async function main(){
  // Check what Abbadomon_Core media record says
  const m = await get('/api/media?where[filename][contains]=Abbadomon&limit=5');
  console.log('Media records with Abbadomon:');
  for(const doc of m.docs||[]){
    console.log('  filename:', doc.filename, 'url:', doc.url);
  }

  // Check what files exist on disk
  const mediaDir = '/home/deploy/app/apps/cms/media';
  const files = fs.readdirSync(mediaDir);
  const abba = files.filter(f => f.toLowerCase().includes('abbadomon'));
  console.log('\nFiles on disk matching abbadomon:', abba);

  // Check a few random media files that DO exist on disk
  console.log('\nFirst 5 files on disk:');
  files.slice(0, 5).forEach(f => console.log('  ' + f));

  // Check if any of these files are served correctly
  for (const f of files.slice(0, 3)) {
    const r = await new Promise((res) => {
      http.get('http://localhost:3001/media/' + encodeURIComponent(f), r => {
        res(r.statusCode);
      }).on('error', () => res(0));
    });
    console.log('  GET /media/' + f + ' => ' + r);
  }

  // Check the Payload CMS staticDir config
  console.log('\nChecking Payload config...');
  const configFiles = [
    '/home/deploy/app/apps/cms/src/payload.config.ts',
    '/home/deploy/app/apps/cms/payload.config.ts',
  ];
  for (const cf of configFiles) {
    try {
      const content = fs.readFileSync(cf, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('staticDir') || lines[i].includes('media') && lines[i].includes('upload')) {
          console.log(`  ${cf}:${i+1}: ${lines[i].trim()}`);
        }
      }
    } catch(e) {}
  }

  // Check Media collection config for upload/staticDir
  const collFiles = [
    '/home/deploy/app/apps/cms/src/collections/Media.ts',
  ];
  for (const cf of collFiles) {
    try {
      const content = fs.readFileSync(cf, 'utf-8');
      console.log('\nMedia collection config (first 30 lines):');
      content.split('\n').slice(0, 30).forEach((l, i) => console.log(`  ${i+1}: ${l}`));
    } catch(e) { console.log('  Not found:', cf); }
  }

  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
