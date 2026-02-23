#!/bin/bash
echo "=== Assess Digimon Data ==="

mongosh --quiet mongodb://localhost:27017/dmo-kb << 'MONGOEOF'
print("All collections:");
db.getCollectionNames().forEach(function(c) {
  var count = db.getCollection(c).countDocuments();
  print("  " + c + ": " + count);
});

print("\nDigimons collection:");
print("  count: " + db.digimons.countDocuments());
var sample = db.digimons.findOne();
if (sample) {
  print("  sample _id type: " + typeof sample._id);
  print("  sample name: " + sample.name);
} else {
  print("  EMPTY - no documents!");
}

print("\nDigimon collection:");
var exists = db.getCollectionNames().indexOf("digimon") >= 0;
print("  exists: " + exists);
if (exists) {
  print("  count: " + db.digimon.countDocuments());
}
MONGOEOF
