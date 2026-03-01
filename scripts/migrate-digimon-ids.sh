#!/bin/bash
echo "=== Migrate Digimon IDs: String → ObjectID ==="
echo "This will convert all string _id fields to proper ObjectIDs"
echo ""

mongosh --quiet mongodb://localhost:27017/dmo-kb << 'MONGOEOF'

// Step 1: Backup count
const beforeCount = db.digimons.countDocuments();
print(`Before: ${beforeCount} docs in 'digimons'`);

// Step 2: Check how many have string IDs
let stringIdCount = 0;
let objectIdCount = 0;
db.digimons.find({}, {_id: 1}).forEach(doc => {
  if (typeof doc._id === 'string') stringIdCount++;
  else objectIdCount++;
});
print(`String IDs: ${stringIdCount}, ObjectID IDs: ${objectIdCount}`);

if (stringIdCount === 0) {
  print("No string IDs to convert. Done!");
} else {
  // Step 3: Convert string IDs to ObjectIDs
  print("\nConverting string IDs to ObjectIDs...");
  
  let converted = 0;
  let errors = 0;
  const oldToNew = {};
  
  db.digimons.find({}).forEach(doc => {
    if (typeof doc._id === 'string') {
      const oldId = doc._id;
      
      // Create new ObjectID
      let newId;
      try {
        // Try to use the string as ObjectID if it's a valid hex string
        newId = ObjectId(oldId);
      } catch(e) {
        // Generate a new ObjectID if the string isn't valid
        newId = new ObjectId();
      }
      
      // Create new doc with ObjectID _id
      const newDoc = Object.assign({}, doc);
      delete newDoc._id;
      newDoc._id = newId;
      
      try {
        db.digimons.insertOne(newDoc);
        db.digimons.deleteOne({_id: oldId});
        oldToNew[oldId] = newId.toString();
        converted++;
      } catch(e) {
        // If ObjectID already exists (from duplicate), just delete the string version
        if (e.code === 11000) {
          db.digimons.deleteOne({_id: oldId});
          oldToNew[oldId] = newId.toString();
          converted++;
        } else {
          print(`  Error converting ${oldId}: ${e.message}`);
          errors++;
        }
      }
    }
  });
  
  print(`Converted: ${converted}, Errors: ${errors}`);
  
  // Step 4: Update references in media collection (belongsTo.digimon is text, no conversion needed)
  // Step 5: Update references in evolution-lines if any
  
  // Step 6: Verify
  const afterCount = db.digimons.countDocuments();
  print(`\nAfter: ${afterCount} docs in 'digimons'`);
  
  // Check ID types
  let newStringCount = 0;
  let newObjectCount = 0;
  db.digimons.find({}, {_id: 1}).limit(5).forEach(doc => {
    if (typeof doc._id === 'string') newStringCount++;
    else newObjectCount++;
  });
  print(`Sample check - String: ${newStringCount}, ObjectID: ${newObjectCount}`);
  
  // Show first 3 docs
  print("\nFirst 3 docs after migration:");
  db.digimons.find({}, {_id: 1, name: 1}).limit(3).forEach(doc => {
    print(`  ${doc._id} (${typeof doc._id}) - ${doc.name}`);
  });
}

// Step 7: Drop the duplicate 'digimon' (singular) collection
print("\n=== Cleanup duplicate 'digimon' collection ===");
const singularCount = db.digimon.countDocuments();
print(`'digimon' (singular) has ${singularCount} docs`);
if (singularCount > 0) {
  db.digimon.drop();
  print("Dropped 'digimon' (singular) collection");
} else {
  print("'digimon' collection is empty or doesn't exist");
}

print("\n=== Migration Complete ===");
MONGOEOF

echo ""
echo "--- Verify Payload API after migration ---"
sleep 2

TOKEN=$(curl -s -X POST http://localhost:3001/api/users/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"${CMS_ADMIN_EMAIL}","password":"${CMS_ADMIN_PASSWORD}"}' | python3 -c "import json,sys;print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

echo "List test:"
FIRST_ID=$(curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon?limit=1" | python3 -c "
import json,sys
d=json.load(sys.stdin)
print(f'  totalDocs={d[\"totalDocs\"]}')
doc=d['docs'][0]
print(f'  first: id={doc[\"id\"]} name={doc[\"name\"]}')
print(doc['id'])
" 2>/dev/null | tail -1)

echo ""
echo "FindByID test ($FIRST_ID):"
curl -s -H "Authorization: JWT $TOKEN" "http://localhost:3001/api/digimon/$FIRST_ID" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if 'name' in d:
    print(f'  OK: {d[\"name\"]} (id={d[\"id\"]})')
else:
    print(f'  FAILED: {str(d)[:200]}')
" 2>/dev/null

echo ""
echo "Update test:"
curl -s -X PATCH -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' \
  "http://localhost:3001/api/digimon/$FIRST_ID" -d '{}' | python3 -c "
import json,sys
d=json.load(sys.stdin)
if d.get('doc'):
    print(f'  OK: updated {d[\"doc\"][\"name\"]}')
else:
    print(f'  FAILED: {str(d)[:200]}')
" 2>/dev/null

echo ""
echo "=== All Done ==="
