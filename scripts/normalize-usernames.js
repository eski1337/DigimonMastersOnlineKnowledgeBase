// Migration: normalize all usernames to lowercase
// Run: mongosh mongodb://localhost:27017/dmo-kb normalize-usernames.js

db.users.find({}, { username: 1 }).forEach(function (u) {
  var lc = u.username ? u.username.toLowerCase() : null;
  if (lc && lc !== u.username) {
    print('Normalizing: ' + u.username + ' -> ' + lc);
    db.users.updateOne({ _id: u._id }, { $set: { username: lc } });
  } else {
    print('OK: ' + u.username);
  }
});

// Create case-insensitive index on username
db.users.createIndex(
  { username: 1 },
  { unique: true, sparse: true, collation: { locale: 'en', strength: 2 } }
);
print('Index created: username (unique, case-insensitive)');
