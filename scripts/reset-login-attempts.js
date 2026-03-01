// Reset all login attempt counters and unlock all accounts
db.users.updateMany(
  {},
  { $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } }
);
print('Reset login attempts for all users');
db.users.find({}, { username: 1, loginAttempts: 1, lockUntil: 1 }).forEach(function(u) {
  print(u.username + ': attempts=' + u.loginAttempts + ', locked=' + (u.lockUntil ? 'yes' : 'no'));
});
