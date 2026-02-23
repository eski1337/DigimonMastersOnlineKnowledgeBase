const http = require('http');
const fs = require('fs');
function get(path){return new Promise((res,rej)=>{http.get('http://localhost:3001'+path,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){res(d)}})}).on('error',rej)})}
async function main(){
  const mediaDir = '/home/deploy/app/apps/cms/media';
  const filesOnDisk = new Set(fs.readdirSync(mediaDir));
  console.log('Files on disk:', filesOnDisk.size);

  // Get all media records
  let allMedia = [];
  let page = 1;
  while(true){
    const r = await get('/api/media?limit=100&page='+page+'&depth=0');
    allMedia = allMedia.concat(r.docs||[]);
    if(!r.hasNextPage) break;
    page++;
  }
  console.log('Media records in DB:', allMedia.length);

  // Check which DB records have missing files
  let missing = 0, found = 0;
  const missingFiles = [];
  for(const m of allMedia){
    if(filesOnDisk.has(m.filename)){
      found++;
    } else {
      missing++;
      if(missingFiles.length < 20) missingFiles.push(m.filename);
    }
  }
  console.log('Files found on disk:', found);
  console.log('Files MISSING from disk:', missing);
  console.log('Sample missing:', missingFiles.slice(0, 10));

  // Check which Digimon have images that point to missing files
  let digiWithBrokenIcon = 0, digiWithBrokenMain = 0;
  let digiTotal = 0;
  page = 1;
  while(true){
    const r = await get('/api/digimon?limit=100&page='+page+'&depth=1');
    for(const doc of r.docs||[]){
      digiTotal++;
      if(doc.icon && typeof doc.icon === 'object'){
        if(!filesOnDisk.has(doc.icon.filename)) digiWithBrokenIcon++;
      }
      if(doc.mainImage && typeof doc.mainImage === 'object'){
        if(!filesOnDisk.has(doc.mainImage.filename)) digiWithBrokenMain++;
      }
    }
    if(!r.hasNextPage) break;
    page++;
  }
  console.log('\nDigimon total:', digiTotal);
  console.log('Digimon with broken icon (file missing):', digiWithBrokenIcon);
  console.log('Digimon with broken mainImage (file missing):', digiWithBrokenMain);

  // Check how many work
  let workingIcon = 0, workingMain = 0, noIcon = 0, noMain = 0;
  page = 1;
  while(true){
    const r = await get('/api/digimon?limit=100&page='+page+'&depth=1');
    for(const doc of r.docs||[]){
      if(doc.icon && typeof doc.icon === 'object' && filesOnDisk.has(doc.icon.filename)) workingIcon++;
      else if(!doc.icon) noIcon++;
      if(doc.mainImage && typeof doc.mainImage === 'object' && filesOnDisk.has(doc.mainImage.filename)) workingMain++;
      else if(!doc.mainImage) noMain++;
    }
    if(!r.hasNextPage) break;
    page++;
  }
  console.log('\nDigimon with WORKING icon:', workingIcon);
  console.log('Digimon with NO icon:', noIcon);
  console.log('Digimon with WORKING mainImage:', workingMain);
  console.log('Digimon with NO mainImage:', noMain);

  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
