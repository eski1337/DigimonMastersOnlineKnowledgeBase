// Run with: mongosh mongodb://localhost:27017/dmo-kb scripts/seed-systems.js
var now = new Date();
var systems = [
  {title:"Chat Commands", slug:"chat-commands", summary:"Overview of all available chat commands in DMO."},
  {title:"Currency", slug:"currency", summary:"All currency types and how to obtain them."},
  {title:"Deck System", slug:"deck-system", summary:"Guide to the Deck system and card bonuses."},
  {title:"Digimon Arena", slug:"digimon-arena", summary:"PvP Arena rules, rankings, and rewards."},
  {title:"Digimon Attribute Arena", slug:"digimon-attribute-arena", summary:"Attribute-based Arena challenges and rewards."},
  {title:"Guild", slug:"guild", summary:"Guild creation, management, and guild-exclusive features."},
  {title:"Instance Dungeons", slug:"instance-dungeons", summary:"All instance dungeons, entry requirements, and loot."},
  {title:"Monster Card", slug:"monster-card", summary:"Monster Card collection, effects, and how to obtain them."},
  {title:"Quests", slug:"quests", summary:"Quest system overview, types, and completion tips."},
  {title:"Rare Machine", slug:"rare-machine", summary:"Rare Machine gacha system and available prizes."},
  {title:"Seal Master", slug:"seal-master", summary:"Seal Master system, seal types, and upgrade paths."},
  {title:"Titles", slug:"titles", summary:"All obtainable titles and their requirements."},
  {title:"Digital Draw", slug:"digital-draw", summary:"Digital Draw lottery system and prize pools."},
  {title:"Digital Fusion", slug:"digital-fusion", summary:"Digital Fusion mechanics and recipes."},
  {title:"D-Unit", slug:"d-unit", summary:"D-Unit system overview and stat bonuses."},
  {title:"D-Unit Hacking", slug:"d-unit-hacking", summary:"D-Unit Hacking process and optimization."},
  {title:"D-Unit Fusion", slug:"d-unit-fusion", summary:"D-Unit Fusion mechanics and success rates."},
  {title:"Digimon Breakthrough", slug:"digimon-breakthrough", summary:"Breakthrough system for Digimon stat upgrades."},
];

var created = 0, skipped = 0;
systems.forEach(function(sys) {
  if (db.systems.countDocuments({slug: sys.slug}) > 0) {
    skipped++;
    return;
  }
  db.systems.insertOne({
    title: sys.title,
    slug: sys.slug,
    summary: sys.summary,
    published: true,
    tags: [{tag: "System"}],
    layout: [],
    createdAt: now,
    updatedAt: now,
  });
  created++;
  print("  + " + sys.title);
});

print("Systems seed: " + created + " created, " + skipped + " already existed.");
