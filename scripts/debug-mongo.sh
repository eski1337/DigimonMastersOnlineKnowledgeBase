#!/bin/bash
echo "=== MongoDB Collection Debug ==="

mongosh --quiet mongodb://localhost:27017/dmo-kb << 'MONGOEOF'
// List all collections
print("=== All collections ===");
db.getCollectionNames().forEach(c => {
  const count = db.getCollection(c).countDocuments();
  const info = db.getCollectionInfos({name: c})[0];
  print(`  ${c}: ${count} docs, type: ${info ? info.type : '?'}`);
});

print("\n=== Check 'digimon' vs 'digimons' ===");
const d1 = db.digimon.countDocuments();
const d2 = db.digimons.countDocuments();
print(`  digimon: ${d1} docs`);
print(`  digimons: ${d2} docs`);

// Check if they have the same data
const first1 = db.digimon.findOne({}, {_id: 1, name: 1});
const first2 = db.digimons.findOne({}, {_id: 1, name: 1});
print(`  digimon first: ${JSON.stringify(first1)}`);
print(`  digimons first: ${JSON.stringify(first2)}`);

// Check ID type
const doc = db.digimons.findOne();
if (doc) {
  print(`\n=== ID type check ===`);
  print(`  _id value: ${doc._id}`);
  print(`  _id type: ${typeof doc._id}`);
  print(`  _id constructor: ${doc._id.constructor.name}`);
  
  // Try to find by the same ID
  const byId = db.digimons.findOne({_id: doc._id});
  print(`  findOne by same _id: ${byId ? byId.name : 'NOT FOUND'}`);
  
  // Try to find by string version
  const strId = doc._id.toString();
  print(`  String ID: ${strId}`);
  const byStrId = db.digimons.findOne({_id: strId});
  print(`  findOne by string _id: ${byStrId ? byStrId.name : 'NOT FOUND'}`);
  
  // Try ObjectId
  const byObjId = db.digimons.findOne({_id: ObjectId(strId)});
  print(`  findOne by ObjectId: ${byObjId ? byObjId.name : 'NOT FOUND'}`);
}

// Check if 'digimon' is a view
print("\n=== Collection info ===");
const info1 = db.getCollectionInfos({name: 'digimon'});
const info2 = db.getCollectionInfos({name: 'digimons'});
print(`  digimon info: ${JSON.stringify(info1)}`);
print(`  digimons info: ${JSON.stringify(info2)}`);

// Drop the singular collection if it's a duplicate/view
print("\n=== Recommendation ===");
if (d1 === d2 && d1 > 0) {
  print("  Both collections have same count. 'digimon' may be causing conflicts.");
  print("  Payload uses 'digimons' (mongoose pluralizes). The 'digimon' collection might be stale.");
}
MONGOEOF
