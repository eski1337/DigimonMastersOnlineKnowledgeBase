const http = require('http');
function get(path){return new Promise((res,rej)=>{http.get('http://localhost:3001'+path,r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{res(JSON.parse(d))}catch(e){res(d)}})}).on('error',rej)})}
async function main(){
  const list=await get('/api/digimon?limit=5&sort=name&depth=1');
  for(const doc of list.docs||[]){
    const icon=doc.icon, main=doc.mainImage;
    console.log(doc.name+':');
    console.log('  icon:', typeof icon==='object'&&icon?icon.url:(icon||'NONE'));
    console.log('  main:', typeof main==='object'&&main?main.url:(main||'NONE'));
  }
  console.log('\n--- depth=0 ---');
  const list0=await get('/api/digimon?limit=3&sort=name&depth=0');
  for(const doc of list0.docs||[]){
    console.log(doc.name+': icon='+String(doc.icon||'NONE').substring(0,40)+' main='+String(doc.mainImage||'NONE').substring(0,40));
  }
  console.log('\n--- media sample ---');
  const media=await get('/api/media?limit=2&where[belongsTo.digimon][exists]=true');
  for(const m of media.docs||[]){
    console.log(m.filename+' url='+m.url+' type='+m.imageType);
  }
  console.log('\n--- test media access ---');
  if(media.docs&&media.docs[0]){
    const url=media.docs[0].url;
    const r=await new Promise((res)=>{http.get('http://localhost:3001'+url,r=>{res(r.statusCode)}).on('error',()=>res(0))});
    console.log('GET '+url+' => '+r);
  }
  process.exit(0);
}
main().catch(e=>{console.error(e);process.exit(1)});
