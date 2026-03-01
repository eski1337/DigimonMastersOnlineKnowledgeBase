const CMS='http://localhost:3001';
const maps=['western-village','western-area-outskirts','western-area-east','wilderness-area','wind-valley','digimon-farm','ruined-historic'];
for(const s of maps){
  const r=await fetch(`${CMS}/api/maps?where[slug][equals]=${s}&limit=1&depth=0`);
  const m=(await r.json()).docs?.[0];
  if(!m){console.log(`${s}: NOT FOUND`);continue;}
  const d=m.wildDigimon||[];const n=m.npcs||[];const p=m.portals||[];
  const hasLvl=d.filter(x=>x.level&&x.level!=='').length;
  const hasAttr=d.filter(x=>x.attribute&&x.attribute!=='').length;
  const hasElem=d.filter(x=>x.element&&x.element!=='').length;
  console.log(`${s}: digi=${d.length}(lvl=${hasLvl},attr=${hasAttr},elem=${hasElem}) npcs=${n.length} portals=${p.length} desc=${m.description?'yes':'no'}`);
}
