// Remove wiki page screenshots from chat-commands layout
// Keep only actual in-game assets (emoticon icons, megaphone UI, chat filter)
// Run: mongosh mongodb://localhost:27017/dmo-kb scripts/fix-remove-wiki-screenshots.js

var doc = db.systems.findOne({slug: "chat-commands"});
if (!doc || !doc.layout) { print("chat-commands not found"); quit(); }

var newLayout = [];
doc.layout.forEach(function(b, i) {
  // Skip image blocks that reference wiki screenshots
  if (b.blockType === "image" && b.imageUrl) {
    if (b.imageUrl.indexOf("Wiki") !== -1) {
      print("  REMOVED block " + i + ": " + b.imageUrl);
      return; // skip this block
    }
  }
  newLayout.push(b);
});

db.systems.updateOne({_id: doc._id}, {$set: {layout: newLayout, updatedAt: new Date()}});
print("+ chat-commands: " + doc.layout.length + " -> " + newLayout.length + " blocks (removed wiki screenshots)");
