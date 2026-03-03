// Run with: mongosh mongodb://localhost:27017/dmo-kb scripts/fix-item-slugs.js
// Fixes item slugs to be URL-friendly (lowercase, hyphenated)

var items = db.items.find({}).toArray();
var fixed = 0;

items.forEach(function(item) {
  var correctSlug = item.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (item.slug !== correctSlug) {
    db.items.updateOne(
      { _id: item._id },
      { $set: { slug: correctSlug, published: true } }
    );
    print("  Fixed: '" + item.slug + "' -> '" + correctSlug + "' (" + item.name + ")");
    fixed++;
  }
});

print("Item slugs: " + fixed + " fixed out of " + items.length + " total.");
