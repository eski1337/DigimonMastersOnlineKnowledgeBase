// Fix Guild with real wiki data + add Monster Card overview
// Run: mongosh mongodb://localhost:27017/dmo-kb scripts/fix-guild-and-monster.js

function h2(t) { return { type: 'h2', children: [{ text: t }] }; }
function h3(t) { return { type: 'h3', children: [{ text: t }] }; }
function p() {
  var parts = Array.prototype.slice.call(arguments);
  return { children: parts.map(function(x) { return typeof x === 'string' ? { text: x } : x; }) };
}
function B(t) { return { text: t, bold: true }; }
function empty() { return { children: [{ text: '' }] }; }
function ul() {
  var items = Array.prototype.slice.call(arguments);
  return {
    type: 'ul',
    children: items.map(function(item) {
      return {
        type: 'li',
        children: [{ children: typeof item === 'string' ? [{ text: item }] : (Array.isArray(item) ? item : [item]) }],
      };
    }),
  };
}
function richText(content) { return { blockType: 'richText', content: content }; }
function callout(type, content) { return { blockType: 'callout', type: type, content: content }; }
function tbl(title, headers, rows) {
  return {
    blockType: 'table',
    title: title,
    headers: headers.map(function(h) { return { label: h }; }),
    rows: rows.map(function(cells) { return { cells: cells.map(function(v) { return { value: String(v) }; }) }; }),
  };
}

var now = new Date();

// ═══════════════════════════════════════════════════════════════════
// GUILD — with real wiki data from Guild.txt
// ═══════════════════════════════════════════════════════════════════
var guildLayout = [
  richText([
    h2('Guild System'),
    p('A guild is an association of players for mutual aid or the pursuit of a common goal. Most people form guilds to combine strengths. It is most often used as a way to assure the procurement of a party and for associates to remain in contact.'),
  ]),
  callout('info', [
    p(B('How to create a Guild: '), { text: 'Talk to ' }, B('Director Hashima'), { text: ' in ' }, B('DATS Center'), { text: '. Buy a ' }, B('Guild Permit'), { text: ' from the Item Shop (Guild tab) for ' }, B('100M'), { text: ', then talk to Director Hashima again and choose "Create a Guild".' }),
  ]),
  richText([
    h3('Guild Member Stats'),
    p('Every guild member has three visible stats:'),
    ul(
      [B('Level'), { text: ' \u2014 Your tamer level' }],
      [B('Fame'), { text: ' \u2014 Your accumulated fame points' }],
      [B('Rank'), { text: ' \u2014 Guild rank determined by Contribution Points (Rank 15 to Rank 0)' }]
    ),
    empty(),
    p('Contribution Points are gained passively by playing the game. You can check your own Contribution Points by hovering over your Rank in the guild menu, or view all members\' points via ', B('Guild Activity'), { text: '.' }),
  ]),
  tbl('Guild Rank \u2014 Contribution Points', ['Guild Rank', 'Contribution Points Required'], [
    ['Rank 15', '0 \u2013 800'],
    ['Rank 14', '801 \u2013 1,600'],
    ['Rank 13', '1,601 \u2013 2,400'],
    ['Rank 12', '2,401 \u2013 3,200'],
    ['Rank 11', '3,201 \u2013 4,000'],
    ['Rank 10', '4,001 \u2013 4,800'],
    ['Rank 9', '4,801 \u2013 5,600'],
    ['Rank 8', '5,601 \u2013 7,200'],
    ['Rank 7', '7,201 \u2013 8,000'],
    ['Rank 6', '8,001 \u2013 8,800'],
    ['Rank 5', '8,801 \u2013 9,600'],
    ['Rank 4', '9,601 \u2013 10,400'],
    ['Rank 3', '10,401 \u2013 11,200'],
    ['Rank 2', '11,201 \u2013 12,000'],
    ['Rank 1', '12,001+'],
    ['Rank 0', 'Guild Master'],
  ]),
  richText([
    h3('Guild Hierarchy'),
  ]),
  tbl('Guild Positions', ['Position', 'Permissions'], [
    ['Guild Master (Rank 0)', 'Full control \u2014 promote/demote, disband, all settings'],
    ['Sub-Master', 'Can invite/kick members, manage some settings'],
    ['Officer', 'Can invite members'],
    ['Member', 'Standard membership, access to guild chat and buffs'],
  ]),
  richText([
    h3('Guild Features'),
    ul(
      [B('Guild Chat'), { text: ' \u2014 Private communication channel (/g command) visible to all guild members regardless of map or channel' }],
      [B('Guild Buffs'), { text: ' \u2014 Passive stat bonuses that apply to all online members' }],
      [B('Guild Raids'), { text: ' \u2014 Cooperative boss battles exclusive to guild members' }],
      [B('Guild Level'), { text: ' \u2014 Guilds level up through member contributions, unlocking perks' }],
      [B('Guild Storage'), { text: ' \u2014 Shared inventory for trading items between members' }]
    ),
    empty(),
    h3('Guild Level Benefits'),
    p('As your guild levels up, you unlock:'),
    ul(
      'Increased maximum member capacity',
      'Stronger guild-wide stat buffs',
      'Access to higher-tier guild raids',
      'Additional guild storage slots',
      'Cosmetic guild features (emblems, badges)'
    ),
  ]),
  callout('tip', [
    p('You can use ', B('/guild invite [name]'), { text: ' to invite players directly from chat. You must be Sub-Master or higher to use guild invite commands.' }),
  ]),
];

var guildDoc = db.systems.findOne({ slug: 'guild' });
if (guildDoc) {
  db.systems.updateOne({ _id: guildDoc._id }, { $set: { layout: guildLayout, updatedAt: now } });
  print('+ guild updated with ' + guildLayout.length + ' blocks (real wiki data)');
} else {
  print('x guild not found');
}

// ═══════════════════════════════════════════════════════════════════
// MONSTER CARD — overview page (content was 0 blocks)
// ═══════════════════════════════════════════════════════════════════
var monsterLayout = [
  richText([
    h2('Monster Card System'),
    p('Monster Cards are collectible items in DMO that give tamers stat bonuses when used. There are multiple tiers of Monster Cards, each with different Digimon listings, drop locations, and reward values.'),
  ]),
  tbl('Monster Card Tiers', ['Tier', 'Cards', 'Difficulty'], [
    ['Monster Card Lv1', 'Basic Digimon (Rookie-level)', 'Beginner'],
    ['Monster Card Lv2', 'Champion-level Digimon', 'Easy'],
    ['Monster Card Lv3', 'Ultimate-level Digimon', 'Moderate'],
    ['Monster Card Lv4', 'Mega-level Digimon', 'Moderate-Hard'],
    ['Monster Card Lv5', 'Stronger Mega-level Digimon', 'Hard'],
    ['Monster Card Lv6', 'Endgame Digimon', 'Very Hard'],
    ['Monster Card Lv7', 'Rarest Digimon', 'Extreme'],
    ['Random Monster Card', 'Random card from any tier', 'Varies'],
  ]),
  richText([
    h3('High Rank Monster Cards'),
    p('High Rank versions exist for Lv1 through Lv6, offering better rewards and featuring stronger Digimon variants.'),
  ]),
  tbl('High Rank Tiers', ['Tier', 'Description'], [
    ['High Rank Monster Card Lv1', 'Enhanced versions of Lv1 Digimon cards'],
    ['High Rank Monster Card Lv2', 'Enhanced versions of Lv2 Digimon cards'],
    ['High Rank Monster Card Lv3', 'Enhanced versions of Lv3 Digimon cards'],
    ['High Rank Monster Card Lv4', 'Enhanced versions of Lv4 Digimon cards'],
    ['High Rank Monster Card Lv5', 'Enhanced versions of Lv5 Digimon cards'],
    ['High Rank Monster Card Lv6', 'Enhanced versions of Lv6 Digimon cards'],
  ]),
  richText([
    h3('Highest Monster Cards'),
    p('The top-tier Monster Cards with the most challenging Digimon and best rewards:'),
  ]),
  tbl('Highest Tiers', ['Tier', 'Description'], [
    ['Highest Monster Card Lv1', 'Pinnacle tier \u2014 Level 1'],
    ['Highest Monster Card Lv2', 'Pinnacle tier \u2014 Level 2'],
    ['Highest Monster Card Lv3', 'Pinnacle tier \u2014 Level 3'],
  ]),
  richText([
    h3('Old Version Cards (2009 \u2013 July 2018)'),
    p('Before the Monster Card rework in July 2018, there was a different set of Monster Cards (Lv1 through Lv6). These old versions are no longer obtainable but their data is preserved for historical reference.'),
  ]),
  callout('tip', [
    p('Monster Cards are one of the main ways to earn rewards from defeating wild Digimon. Focus on completing one tier fully before moving to the next for maximum efficiency.'),
  ]),
];

var mcDoc = db.systems.findOne({ slug: 'monster-card' });
if (mcDoc) {
  db.systems.updateOne({ _id: mcDoc._id }, { $set: { layout: monsterLayout, updatedAt: now } });
  print('+ monster-card updated with ' + monsterLayout.length + ' blocks');
} else {
  print('x monster-card not found');
}

print('\nDone.');
