// Fix: drop old index, create case-insensitive one
db.users.dropIndex('username_1');
print('Dropped old username_1 index');

db.users.createIndex(
  { username: 1 },
  { unique: true, sparse: true, collation: { locale: 'en', strength: 2 } }
);
print('Created new username_1 index (unique, sparse, case-insensitive)');

// Verify
db.users.getIndexes().forEach(function(idx) {
  if (idx.key.username) print(JSON.stringify(idx));
});
