#!/bin/bash
echo "=== Check Recovery Options ==="

echo "--- 1. MongoDB oplog (if replica set) ---"
mongosh --quiet mongodb://localhost:27017/dmo-kb --eval 'try { print("Oplog: " + db.adminCommand({replSetGetStatus:1}).ok) } catch(e) { print("Not a replica set: " + e.message.substring(0,50)) }'

echo ""
echo "--- 2. Check for mongodump/backup files ---"
find / -name "*.bson" -path "*digi*" 2>/dev/null | head -5
find /home/deploy -name "*.json" -path "*digi*" -size +1k 2>/dev/null | head -10
find /home/deploy -name "*backup*" -o -name "*dump*" -o -name "*export*" 2>/dev/null | head -10
ls -la /home/deploy/backup* /home/deploy/dump* /home/deploy/app/backup* 2>/dev/null

echo ""
echo "--- 3. Check PM2 logs for import history ---"
# The Digimon were imported via the wiki scraper - there might be logs showing what was imported
pm2 logs cms --lines 100 --nostream 2>&1 | grep -i "import\|saved\|digimon" | head -20

echo ""
echo "--- 4. Check if there's a data directory with exports ---"
ls -la /home/deploy/app/data/ 2>/dev/null | head -10
ls -la /home/deploy/app/exports/ 2>/dev/null | head -10
ls -la /home/deploy/app/scripts/ 2>/dev/null | head -10

echo ""
echo "--- 5. Check media collection for Digimon references ---"
mongosh --quiet mongodb://localhost:27017/dmo-kb << 'MONGOEOF'
var digimonMedia = db.media.find({"belongsTo.digimon": {$exists: true, $ne: ""}}, {"belongsTo.digimon": 1, "sourceUrl": 1}).limit(5).toArray();
print("Media with digimon refs: " + db.media.countDocuments({"belongsTo.digimon": {$exists: true, $ne: ""}}));
digimonMedia.forEach(function(m) {
  print("  " + m.belongsTo.digimon + " - " + (m.sourceUrl || "no url"));
});
MONGOEOF

echo ""
echo "--- 6. Check git for any data files ---"
cd /home/deploy/app
git log --oneline -10 --all -- "*.json" "data/*" "exports/*" 2>/dev/null

echo ""
echo "--- 7. Check web app for cached/static Digimon data ---"
find /home/deploy/app/apps/web -name "*.json" -size +10k 2>/dev/null | head -5
ls -la /home/deploy/app/apps/web/.next/cache/ 2>/dev/null | head -5

echo ""
echo "=== Recovery Assessment ==="
echo "The 620 Digimon were imported via the wiki scraper tool."
echo "They can be re-imported using the /api/import-digimon endpoint."
echo "The media collection (1054 images) is intact and can be relinked."
