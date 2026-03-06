/**
 * Fix media documents that were incorrectly renamed with -1, -2 suffixes.
 * 
 * Strategy:
 * - Find all media docs where filename matches pattern like "Name-1.png" or "Name-2.png"
 *   but NOT Payload size variants like "Name-400x400.png"
 * - Check if the original filename (without the -N suffix) exists as another media doc
 * - If the original doc exists, this -N doc is a duplicate reference — delete the -N doc
 *   and remove the -N file from disk
 * - If no original exists, rename back (strip the -N suffix)
 * 
 * Run: mongosh --quiet /tmp/fix-media-renames.js
 */
use("dmo-kb");

// Match filenames like "Agumon-1.png", "Agumon_Icon-2.png"
// But NOT size variants like "Agumon-400x400.png"
const suffixPattern = /-(\d+)\.(png|jpe?g|gif|webp|svg)$/i;

let fixed = 0;
let skipped = 0;
let errors = 0;

const docs = db.media.find({ filename: { $regex: /-[12]\.(png|jpe?g|gif|webp|svg)$/i } }).toArray();
print("Found " + docs.length + " media docs with -N suffix");

for (const doc of docs) {
  const fn = doc.filename;
  const match = fn.match(suffixPattern);
  if (!match) { skipped++; continue; }
  
  // Skip if it looks like a Payload size variant (e.g. -400x400)
  if (/\d+x\d+/.test(match[1])) { skipped++; continue; }
  
  const suffix = match[1]; // "1" or "2"
  const ext = "." + match[2];
  const originalFilename = fn.replace(suffixPattern, ext);
  
  // Check if original filename exists as another media doc
  const original = db.media.findOne({ filename: originalFilename, _id: { $ne: doc._id } });
  
  if (original) {
    // Original exists — this -N doc is likely a broken duplicate
    // Update any digimon/items that reference this -N doc to point to the original
    const docId = doc._id;
    const origId = original._id;
    
    // Fix digimon references
    let r1 = db.digimon.updateMany({ icon: docId }, { $set: { icon: origId } });
    let r2 = db.digimon.updateMany({ mainImage: docId }, { $set: { mainImage: origId } });
    let r3 = db.digimon.updateMany({ "skills.icon": docId }, { $set: { "skills.$[s].icon": origId } }, { arrayFilters: [{ "s.icon": docId }] });
    
    // Fix item references  
    let r4 = db.getCollection("items").updateMany({ icon: docId }, { $set: { icon: origId } });
    let r5 = db.getCollection("items").updateMany({ image: docId }, { $set: { image: origId } });
    
    let refsFixed = (r1.modifiedCount || 0) + (r2.modifiedCount || 0) + (r3.modifiedCount || 0) + (r4.modifiedCount || 0) + (r5.modifiedCount || 0);
    
    if (refsFixed > 0) {
      print("REPOINTED: " + fn + " → " + originalFilename + " (" + refsFixed + " refs)");
    }
    
    // Delete the -N media doc (the file on disk can be cleaned up separately)
    db.media.deleteOne({ _id: docId });
    fixed++;
  } else {
    // No original — rename back by stripping suffix
    // Also fix the sizes
    const sizes = doc.sizes || {};
    const oldBase = fn.replace(ext, "");
    const newBase = originalFilename.replace(ext, "");
    
    const updatedSizes = {};
    for (const [sizeName, sizeData] of Object.entries(sizes)) {
      if (sizeData && sizeData.filename) {
        updatedSizes["sizes." + sizeName + ".filename"] = sizeData.filename.replace(oldBase, newBase);
      }
    }
    
    const updateObj = { $set: { filename: originalFilename, ...updatedSizes } };
    db.media.updateOne({ _id: doc._id }, updateObj);
    print("RENAMED: " + fn + " → " + originalFilename);
    fixed++;
  }
}

print("\nDone: " + fixed + " fixed, " + skipped + " skipped, " + errors + " errors");
