// Update Game Systems with images + visual improvements
// Run: mongosh mongodb://localhost:27017/dmo-kb scripts/update-systems-images.js

function h2(t) { return { type: 'h2', children: [{ text: t }] }; }
function h3(t) { return { type: 'h3', children: [{ text: t }] }; }
function h4(t) { return { type: 'h4', children: [{ text: t }] }; }
function p() {
  var parts = Array.prototype.slice.call(arguments);
  return { children: parts.map(function(x) { return typeof x === 'string' ? { text: x } : x; }) };
}
function B(t) { return { text: t, bold: true }; }
function I(t) { return { text: t, italic: true }; }
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
function img(url, caption, size) { return { blockType: 'image', imageUrl: url, caption: caption || '', size: size || 'large' }; }
function imageGrid(title, cols, images) {
  return {
    blockType: 'imageGrid',
    title: title,
    columns: cols,
    images: images.map(function(i) { return { imageUrl: i[0], caption: i[1] || '' }; }),
  };
}
function tbl(title, headers, rows) {
  return {
    blockType: 'table',
    title: title,
    headers: headers.map(function(h) { return { label: h }; }),
    rows: rows.map(function(cells) { return { cells: cells.map(function(v) {
      if (typeof v === 'object' && v.value !== undefined) return v;
      return { value: String(v) };
    }) }; }),
  };
}
function cellIcon(value, iconUrl) { return { value: value, iconUrl: iconUrl }; }

var now = new Date();
var updated = 0;

function updateSystem(slug, layout) {
  var doc = db.systems.findOne({slug: slug});
  if (!doc) { print('  MISSING: ' + slug); return; }
  db.systems.updateOne({_id: doc._id}, {$set: {layout: layout, updatedAt: now}});
  print('  + ' + slug + ' -> ' + layout.length + ' blocks');
  updated++;
}

// ═══════════════════════════════════════════════════════════════════
// CHAT COMMANDS
// ═══════════════════════════════════════════════════════════════════
updateSystem('chat-commands', [
  richText([
    h2('Chat Commands'),
    p('Digimon Masters Online features a set of chat commands for communicating with other players, performing emotes, and using special items like Megaphones.'),
  ]),
  img('/guides/systems/chat/WikiCommands.png', 'Chat Commands reference from the DMO Wiki — all slash commands and their descriptions', 'large'),
  richText([
    h3('Chat Channels'),
    p('The game has multiple chat channels, each color-coded for easy identification:'),
  ]),
  tbl('Chat Channel Commands', ['Command', 'Channel', 'Description'], [
    ['/n or /N', 'Normal', 'Regular chat. Anyone nearby in the same channel can see this.'],
    ['/s or /S', 'Shout', 'Shouting. Anyone in your current map can see this, regardless of channel.'],
    ['/p or /P', 'Party', 'Party chat. All party members will see it, regardless of channel or map.'],
    ['/g or /G', 'Guild', 'Guild chat. All guild members will see it, regardless of channel or map.'],
    ['/w or /W', 'Whisper', 'Whispering. Only the specified person you\'re whispering will see it.'],
    ['/r or /R', 'Reply', 'Replying to a whisper. Allows you to reply the last whisper received.'],
  ]),
  richText([
    h3('Social & Utility Commands'),
  ]),
  tbl('Social Commands', ['Command', 'Type', 'Description'], [
    ['/block', 'Block', 'To block a user. Blocks whispers, trades, normal chat and shouts.'],
    ['/friend', 'Friend', 'To add a user to your friends list. Press F to open your friends list.'],
    ['/guild', 'Guild (invite)', 'To add a user to the guild you belong to. You MUST be Sub-Master or Master.'],
    ['/invite', 'Party invite', 'To add a user to your party. If no party exists, it creates one.'],
    ['/trade', 'Trade', 'Invites a user to trade with you.'],
    ['/leave', 'Leave party', 'Leaves the current party you\'re in.'],
    ['/shopfinder', 'Shop Locator', 'Locates shops with specific characters. Ex: "/shopfinder [Dex]" finds all shops with "Dex" in their names.'],
  ]),
  richText([
    h3('Emoticons'),
    p('Use these commands to display animated emoticons above your character:'),
  ]),
  imageGrid('Available Emoticons', '4', [
    ['/guides/systems/chat/Hi.png', '/hi — Waving'],
    ['/guides/systems/chat/Yes.png', '/yes — Thumbs up'],
    ['/guides/systems/chat/No.png', '/no — Shaking finger'],
    ['/guides/systems/chat/Cheer.png', '/cheer — Cheering'],
    ['/guides/systems/chat/Despair.png', '/despair — Despair'],
    ['/guides/systems/chat/Joy.png', '/joy — Laughing'],
    ['/guides/systems/chat/Taunt.png', '/taunt — Bring it on'],
    ['/guides/systems/chat/Flex.png', '/flex — Flexing'],
    ['/guides/systems/chat/Dance.png', '/dance — Dancing'],
  ]),
  richText([
    h3('Megaphone System'),
    p('Megaphones allow you to broadcast messages to ', B('all players on the server'), {text:', regardless of channel or map. They come in different types:'}),
  ]),
  img('/guides/systems/chat/HighRankMegaphone.png', 'High Rank Megaphone — sends a colored shout message server-wide', 'medium'),
  img('/guides/systems/chat/MegaphoneMessage.png', 'The Megaphone input window', 'medium'),
  img('/guides/systems/chat/MegaphoneSentMessage.png', 'A megaphone message as seen in chat', 'small'),
  richText([
    h3('Megaphone Blocker'),
    p('If megaphone messages become distracting, you can use a ', B('Megaphone Blocker'), {text:' item to toggle them off:'}),
  ]),
  img('/guides/systems/chat/MegaphoneBlocker.png', 'Megaphone Blocker — blocks incoming megaphone messages', 'medium'),
  richText([
    h3('Chat Filter Settings'),
    p('You can customize which chat types are visible by toggling the filter checkboxes above the chat window:'),
  ]),
  img('/guides/systems/chat/ChatFilter.png', 'Chat filter toggles — Normal, Party, Guild, Whisper, Shout, Megaphone', 'medium'),
  callout('tip', [
    p('You can click on a player\'s name in chat to quickly whisper them. Use ', B('/shopfinder'), {text:' to find player shops selling specific items!'}),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// CURRENCY
// ═══════════════════════════════════════════════════════════════════
updateSystem('currency', [
  richText([
    h2('Currency System'),
    p('DMO uses multiple currency types for different purposes. Understanding the economy is essential for progression.'),
  ]),
  img('/guides/systems/currency/CurrencyWindow.png', 'The in-game currency display showing Mega (M) and Bit (B) denominations', 'small'),
  tbl('Currency Types', ['Currency', 'How to Obtain', 'Primary Use'], [
    ['Bit (B)', 'Monster drops, quests, selling items', 'Basic purchases, NPC shops'],
    ['Mega (M)', '1,000 Bits = 1 Mega', 'Mid-tier purchases'],
    ['Tera (T)', '1,000 Mega = 1 Tera', 'High-value items, player trading'],
    ['Crown (C)', 'Cash shop (real money)', 'Premium items, Cash Shop'],
    ['DigiCore', 'Daily dungeons, events', 'Evolution items, special NPCs'],
    ['Arena Coins', 'PvP Arena participation', 'Arena shop rewards'],
    ['Seal Coins', 'Seal Master activities', 'Seal upgrades and materials'],
    ['Event Tokens', 'Seasonal events', 'Event-exclusive items'],
  ]),
  callout('info', [
    p(B('Exchange Rate: '), {text:'1 Tera (T) = 1,000 Mega (M) = 1,000,000 Bit (B). The primary trading currency between players is Tera (T).'}),
  ]),
  richText([
    h3('Economy Tips'),
    ul(
      'Crown items can often be traded on the player market',
      'Daily dungeons are the most reliable source of DigiCore',
      'Event tokens typically expire when the event ends — spend them before the deadline',
      'Some currencies are account-bound while others are character-bound'
    ),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// DIGIMON ARENA
// ═══════════════════════════════════════════════════════════════════
updateSystem('digimon-arena', [
  richText([
    h2('Digimon Arena'),
    p('The Digimon Arena (Colosseum) is the primary PvP system in DMO, allowing tamers to battle each other for rankings, rewards, and bragging rights.'),
  ]),
  img('/guides/systems/arena/Colosseum_Entrance.png', 'The Colosseum entrance — where tamers enter to challenge each other', 'large'),
  img('/guides/systems/arena/Colosseum_Map.png', 'Colosseum Stadium map overview', 'medium'),
  richText([
    h3('Entry Requirements'),
    p('To enter the arena, you need a ', B('Digimon Arena Admission'), {text:' ticket:'}),
  ]),
  img('/guides/systems/arena/Arena_Admission.png', 'Digimon Arena Admission ticket', 'small'),
  richText([
    h3('Arena Modes'),
    ul(
      [B('1v1 Arena'), {text:' — Solo battles between two tamers and their Digimon'}],
      [B('Tag Arena'), {text:' — Team-based battles with multiple tamers per side'}],
      [B('Ranked Arena'), {text:' — Competitive mode with seasonal rankings and exclusive rewards'}]
    ),
    empty(),
    h3('Rules & Mechanics'),
    ul(
      'Level and stat balancing may apply in certain modes',
      'Cooldowns and skill usage follow PvP-specific rules',
      'Matches have a time limit — if time runs out, the player with more HP% wins',
      'Some skills have reduced effectiveness in PvP',
      'Burst Mode and Jogress are allowed in most modes'
    ),
    empty(),
    h3('Rewards'),
    ul(
      'Arena Coins — earned per match (more for wins)',
      'Seasonal ranking rewards (titles, exclusive items)',
      'Arena Shop — spend Arena Coins on evolution materials, accessories, and more',
      'Special titles for reaching specific ranks'
    ),
  ]),
  callout('warning', [
    p('Arena rankings reset each season. Make sure to claim your seasonal rewards before the reset!'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// ATTRIBUTE ARENA
// ═══════════════════════════════════════════════════════════════════
updateSystem('digimon-attribute-arena', [
  richText([
    h2('Digimon Attribute Arena'),
    p('The Attribute Arena is a specialized PvP mode that restricts participation based on Digimon attributes (Vaccine, Data, Virus, Free). Each period focuses on specific attributes.'),
  ]),
  img('/guides/systems/attribute-arena/Colosseum_Entrance.png', 'The Colosseum — shared location for both regular and Attribute Arena', 'large'),
  richText([
    h3('How It Works'),
    ul(
      'Only Digimon with the matching attribute can participate during each rotation',
      'Rotations change on a regular schedule (typically weekly)',
      'The attribute triangle applies: Vaccine > Virus > Data > Vaccine',
      'Free attribute can participate in any rotation but has no type advantage'
    ),
    empty(),
    h3('Rewards'),
  ]),
  img('/guides/systems/attribute-arena/Attribute_Arena_Coin.png', 'Attribute Arena Coin — unique currency for this mode', 'small'),
  richText([
    ul(
      'Attribute Arena Coins — unique currency for this mode',
      'Exclusive accessories and costumes available only through this arena',
      'Ranking titles specific to Attribute Arena',
      'Special evolution materials for certain Digimon'
    ),
  ]),
  callout('tip', [
    p('Prepare Digimon of all three main attributes so you can participate in every rotation. Free attribute Digimon are versatile but lack the damage bonus from type advantage.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// INSTANCE DUNGEONS
// ═══════════════════════════════════════════════════════════════════
updateSystem('instance-dungeons', [
  richText([
    h2('Instance Dungeons'),
    p('Instance Dungeons are private, instanced PvE content that tamers can enter solo or in a party. They offer exclusive loot, evolution materials, and challenging boss fights.'),
    empty(),
    h3('General Rules'),
    ul(
      'You\'re unable to ride your Digimon inside',
      'You can go inside with a party of up to 4 people including yourself',
      'Leaving / getting kicked from the party will force you out',
      'Enemy Digimon inside do not re-spawn',
      'Dropped items inside do not de-spawn'
    ),
  ]),
  callout('info', [
    p('Battle Tags cannot be used in Venomous Vortex and Fuji TV Rooftop dungeons.'),
  ]),
  richText([
    h3('Dungeon List & Entry Items'),
    p('Each dungeon requires a specific pass or ticket to enter. Here is the complete list:'),
  ]),
  tbl('Instance Dungeons', ['Dungeon', 'Entry Item', 'Modes'], [
    [cellIcon('Kaiser\'s Laboratory', '/guides/systems/dungeons/Kaiser\'s_Laboratory_Warp_Gate.png'), 'Kaiser\'s Laboratory Warp Gate', 'Easy, Normal, Hard'],
    ['Ancient Ruins of Secret', 'Free entry', 'Normal'],
    [cellIcon('Crack of Devimon', '/guides/systems/dungeons/Devimon\'s_Crack_pass.png'), 'Devimon\'s Crack Pass', 'Normal (4P), Hard (4P)'],
    [cellIcon('Datamon Maze', '/guides/systems/dungeons/Datamon_Maze_Pass_Card.png'), 'Datamon Maze Pass Card', 'Easy (free), Normal, Hard'],
    ['Scar of Water Crystal', 'Pass [Scar of Water Crystal]', 'Easy, Normal, Hard'],
    ['Uprising Flame', 'Pass [Uprising Flame]', 'Easy, Normal, Hard'],
    [cellIcon('Trace of Black Steel', '/guides/systems/dungeons/Pass_Traces_of_Black_Steel.png'), 'Pass [Trace of Black Steel]', 'Easy, Normal, Hard'],
    [cellIcon('Descending Thunder God', '/guides/systems/dungeons/Pass_Descending_Thunder_God.png'), 'Pass [Descending Thunder God]', 'Easy, Normal, Hard'],
    [cellIcon('Fanglongmon Dungeon', '/guides/systems/dungeons/Pass_Fanglongmon_Dungeon.png'), 'Pass [Fanglongmon Dungeon]', 'Easy, Normal, Hard'],
    [cellIcon('Shadow Labyrinth', '/guides/systems/dungeons/Shadow_Labyrinth_Patchfinder.png'), 'Shadow Labyrinth Patchfinder', 'Normal, Hard'],
    [cellIcon('Royal Base', '/guides/systems/dungeons/Dimension_Warp_-_Royal_Base.png'), 'Dimension Warp - Royal Base', 'Normal, Easy'],
    [cellIcon('Tokyo Tower Observatory', '/guides/systems/dungeons/Tokyo_Tower_Observatory_Admission.png'), 'Tokyo Tower Observatory Admission', 'Normal, Easy'],
    [cellIcon('Fuji TV Rooftop', '/guides/systems/dungeons/Fuji_TV_Staff_ID_Card.png'), 'Fuji TV Staff ID Card', 'Normal, Easy'],
    [cellIcon('Venomous Vortex', '/guides/systems/dungeons/Arrow_of_Light_and_Hope.png'), 'Arrow of Light and Hope', 'Normal, Easy'],
    ['Rainbow Bridge', 'Ikkakumon\'s Help [Normal]', 'Normal'],
    [cellIcon('Gankoomon\'s Training Ground', '/guides/systems/dungeons/Training_Ground_Entrance_Ticket.png'), 'Training Ground Entrance Ticket', 'Normal'],
    ['Destruction and Regeneration', 'Susanoomon\'s Trace', 'Easy, Normal, Hard'],
    ['Digimon Kaiser', 'Dark Tower Fragments', 'Easy, Normal, Hard'],
    ['Marketplace', 'Dim Card', 'Easy, Normal, Hard'],
  ]),
  richText([
    h3('Useful Dungeon Items'),
  ]),
  imageGrid('Common Dungeon Passes', '4', [
    ['/guides/systems/dungeons/Kaiser\'s_Laboratory_Warp_Gate.png', 'Kaiser\'s Lab Warp Gate'],
    ['/guides/systems/dungeons/Datamon_Maze_Pass_Card.png', 'Datamon Maze Pass'],
    ['/guides/systems/dungeons/Pass_Fanglongmon_Dungeon.png', 'Fanglongmon Pass'],
    ['/guides/systems/dungeons/Shadow_Labyrinth_Patchfinder.png', 'Shadow Labyrinth Pass'],
    ['/guides/systems/dungeons/Dimension_Warp_-_Royal_Base.png', 'Royal Base Warp'],
    ['/guides/systems/dungeons/Tokyo_Tower_Observatory_Admission.png', 'Tokyo Tower Admission'],
    ['/guides/systems/dungeons/Arrow_of_Light_and_Hope.png', 'Arrow of Light & Hope'],
    ['/guides/systems/dungeons/Battle_Tag.png', 'Battle Tag'],
    ['/guides/systems/dungeons/Training_Ground_Entrance_Ticket.png', 'Training Ground Ticket'],
    ['/guides/systems/dungeons/Xuanwumon_Ticket.png', 'Xuanwumon Ticket'],
    ['/guides/systems/dungeons/Zhuqiaomon_Ticket.png', 'Zhuqiaomon Ticket'],
    ['/guides/systems/dungeons/Fuji_TV_Staff_ID_Card.png', 'Fuji TV Staff ID'],
  ]),
  callout('tip', [
    p('Daily dungeons should be done every day for maximum DigiCore income. Entry counts typically reset at midnight server time.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// DECK SYSTEM (no images, but enhanced content)
// ═══════════════════════════════════════════════════════════════════
updateSystem('deck-system', [
  richText([
    h2('Deck System'),
    p('The Deck System allows tamers to collect Digimon cards and place them in card slots to receive permanent stat bonuses. Cards are obtained by scanning specific Digimon.'),
    empty(),
    h3('How It Works'),
    ul(
      'Each Digimon can be scanned to obtain its card',
      'Cards are placed into deck slots',
      'Each card provides specific stat bonuses (AT, HP, DE, etc.)',
      'Completing card sets (e.g., all Digimon of one family) unlocks bonus effects',
      'Multiple deck pages can be configured for different setups'
    ),
    empty(),
    h3('Obtaining Cards'),
    ul(
      'Defeat a Digimon and use the Scan function',
      'Cards drop based on RNG — rarer Digimon have lower scan rates',
      'Some cards are only available from dungeon bosses or events',
      'Duplicate cards can be used to level up existing cards for stronger bonuses'
    ),
  ]),
  tbl('Card Grades', ['Grade', 'Stat Multiplier', 'Rarity'], [
    ['Normal', '1.0x (base)', 'Common drop'],
    ['Rare', '1.5x bonus', 'Uncommon'],
    ['Epic', '2.0x bonus', 'Rare'],
    ['Legendary', '3.0x bonus', 'Very rare'],
  ]),
  callout('tip', [
    p('Focus on completing full family sets first, as the set bonus often outweighs individual card stats. Check your Deck collection regularly to see which cards you\'re missing.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// GUILD (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('guild', [
  richText([
    h2('Guild System'),
    p('Guilds are player-created organizations that provide social features, exclusive content, and stat bonuses to their members.'),
    empty(),
    h3('Creating a Guild'),
    ul(
      'Requires a specific amount of in-game currency',
      'Guild name must be unique and follow naming rules',
      'The creator becomes the Guild Master',
      'Initial member capacity starts small and can be expanded'
    ),
  ]),
  tbl('Guild Ranks', ['Rank', 'Permissions'], [
    ['Guild Master', 'Full control over guild settings, can promote/demote and disband'],
    ['Vice Master', 'Can invite/kick members, manage some settings'],
    ['Officer', 'Can invite members'],
    ['Member', 'Standard membership'],
  ]),
  richText([
    h3('Guild Features'),
    ul(
      [B('Guild Chat'), {text:' — Private communication channel for guild members'}],
      [B('Guild Buffs'), {text:' — Passive stat bonuses that apply to all online members'}],
      [B('Guild Raids'), {text:' — Cooperative boss battles exclusive to guild members'}],
      [B('Guild Level'), {text:' — Guilds level up through member contributions, unlocking perks'}],
      [B('Guild Storage'), {text:' — Shared inventory for trading items between members'}]
    ),
    empty(),
    h3('Guild Level Benefits'),
    ul(
      'Increased maximum member capacity',
      'Stronger guild-wide stat buffs',
      'Access to higher-tier guild raids',
      'Additional guild storage slots',
      'Cosmetic guild features (emblems, badges)'
    ),
  ]),
  callout('info', [
    p('Guilds level up through member contributions. The higher the guild level, the stronger the passive buffs for all members.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// QUESTS (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('quests', [
  richText([
    h2('Quest System'),
    p('Quests are structured objectives that guide tamers through the game world, providing EXP, items, currency, and story progression.'),
  ]),
  tbl('Quest Types', ['Type', 'Reset', 'Description'], [
    ['Main Quests', 'One-time', 'Story-driven quests that unlock new maps and features'],
    ['Side Quests', 'One-time', 'Optional quests with additional rewards and world-building'],
    ['Daily Quests', 'Daily reset', 'Repeatable quests, great for steady income'],
    ['Repeatable Quests', 'No limit', 'Can be completed multiple times'],
    ['Event Quests', 'Event period', 'Time-limited quests during special events'],
    ['Tamer Quests', 'One-time', 'Tamer-specific progression quests for leveling'],
  ]),
  richText([
    h3('Quest Rewards'),
    ul(
      'EXP — For both Tamer and Digimon',
      'Currency — Bits, Mega, or special tokens',
      'Items — Equipment, consumables, materials',
      'Evolution Materials — Key items for Digimon evolution',
      'Titles — Some quests grant unique titles',
      'Map Access — Completing main quests unlocks new areas'
    ),
  ]),
  callout('tip', [
    p('Always pick up daily quests — they compound over time. Main quests should be prioritized for map and feature unlocks. Event quests often have the best reward-to-effort ratio.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// RARE MACHINE (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('rare-machine', [
  richText([
    h2('Rare Machine'),
    p('The Rare Machine is DMO\'s gacha system where tamers can spend tokens or currency for a chance at rare items, Digimon, and exclusive rewards.'),
    empty(),
    h3('How It Works'),
    ul(
      'Insert the required token/currency into the Rare Machine',
      'The machine randomly selects a prize from the current prize pool',
      'Prize pools rotate periodically with different featured items',
      'Some machines have guaranteed jackpot mechanics after a certain number of tries'
    ),
  ]),
  tbl('Machine Types', ['Type', 'Currency', 'Prize Quality'], [
    ['Normal Rare Machine', 'Standard tokens', 'Common to Rare'],
    ['Premium Rare Machine', 'Premium tokens / Crown', 'Better prize pools'],
    ['Event Rare Machine', 'Event currency', 'Exclusive prizes'],
    ['Mileage System', 'Accumulated points', 'Guaranteed rewards'],
  ]),
  callout('warning', [
    p('The Rare Machine is a gacha system with randomized rewards. Rates for top-tier items are typically very low. Check the prize pool before spending — some rotations are better than others.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// SEAL MASTER (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('seal-master', [
  richText([
    h2('Seal Master'),
    p('The Seal Master system allows tamers to equip seals on their Digimon for additional stat bonuses. Seals can be upgraded and combined for stronger effects.'),
  ]),
  tbl('Seal Types', ['Seal', 'Primary Stats', 'Best For'], [
    ['Leader Seal', 'AT, CT', 'Offensive builds'],
    ['Soul Seal', 'HP, DE, EV', 'Balanced builds'],
    ['Attack Seal', 'AT, AS', 'Pure DPS'],
    ['Defense Seal', 'DE, HP, BL', 'Tank builds'],
  ]),
  richText([
    h3('How to Use'),
    ul(
      'Visit the Seal Master NPC in town',
      'Equip seals into the available seal slots on your Digimon',
      'Each Digimon has limited seal slots',
      'Seals can be removed and re-equipped freely'
    ),
    empty(),
    h3('Upgrading Seals'),
    ul(
      'Combine lower-grade seals to create higher-grade ones',
      'Upgrade success is not guaranteed — higher tiers have lower success rates',
      'Use protection items to prevent seal destruction on failure',
      'Seal materials can be obtained from dungeons, events, and the Seal Shop'
    ),
  ]),
  callout('tip', [
    p('Focus on maxing one seal type that complements your Digimon\'s role before diversifying. Attack seals for DPS Digimon, Defense seals for tanks.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// TITLES (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('titles', [
  richText([
    h2('Titles'),
    p('Titles are cosmetic (and sometimes stat-boosting) labels that appear beside your tamer name. They are earned through various achievements, events, and progression milestones.'),
  ]),
  tbl('Title Categories', ['Category', 'Source', 'Example Bonuses'], [
    ['Combat Titles', 'Defeating bosses, combat milestones', 'AT bonuses'],
    ['Collection Titles', 'Card sets, scanning Digimon', 'CT bonuses'],
    ['Achievement Titles', 'Level/quest milestones', 'All-stat bonuses'],
    ['Arena Titles', 'PvP rankings', 'AT, HP bonuses'],
    ['Event Titles', 'Seasonal events', 'Various'],
    ['Special Titles', 'Promotions, contests', 'Unique effects'],
  ]),
  richText([
    h3('How to Equip'),
    ul(
      'Open the Title menu from your character panel',
      'Select the title you want to display',
      'Only one title can be active at a time',
      'The stat bonus of the equipped title is always active'
    ),
  ]),
  callout('info', [
    p('Some titles provide significant stat bonuses. Always equip a title — even a small bonus adds up!'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// DIGITAL DRAW (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('digital-draw', [
  richText([
    h2('Digital Draw'),
    p('Digital Draw is a lottery-style system where tamers use tickets to draw prizes from rotating prize pools.'),
    empty(),
    h3('How It Works'),
    ul(
      'Obtain Digital Draw tickets from events, daily login, or the Cash Shop',
      'Use tickets at the Digital Draw machine',
      'Each draw consumes one ticket and awards a random prize',
      'Prize pools change periodically with featured items',
      'Some draws have step-up mechanics with improving odds'
    ),
  ]),
  tbl('Prize Tiers', ['Tier', 'Contents', 'Drop Rate'], [
    ['Grand Prize', 'Ultra-rare items, exclusive Digimon eggs, premium evo materials', 'Very low'],
    ['1st Prize', 'Rare items, valuable consumables', 'Low'],
    ['2nd Prize', 'Uncommon items, useful materials', 'Medium'],
    ['3rd Prize', 'Common items, basic consumables', 'High'],
    ['Consolation', 'Minimum reward guaranteed', 'Guaranteed'],
  ]),
  callout('info', [
    p('Check the current prize pool rotation before using your tickets. Some rotations feature significantly better prizes than others.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// DIGITAL FUSION (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('digital-fusion', [
  richText([
    h2('Digital Fusion'),
    p('Digital Fusion is the crafting/synthesis system in DMO that allows tamers to combine materials and items to create new, more powerful equipment and items.'),
  ]),
  tbl('Fusion Types', ['Type', 'Description', 'Key Items'], [
    ['Item Fusion', 'Combine materials to create equipment, accessories, consumables', 'Crafting materials'],
    ['Digimon Fusion (Jogress)', 'Fuse two compatible Digimon into a more powerful form', 'Jogress chips'],
    ['Accessory Fusion', 'Upgrade accessories by combining them with materials', 'Accessories + materials'],
  ]),
  richText([
    h3('How to Fuse'),
    ul(
      'Visit the Fusion NPC or access the fusion menu',
      'Select the recipe/fusion type',
      'Place required materials in the fusion slots',
      'Pay the fusion fee (currency)',
      'Confirm — some fusions have success/failure rates'
    ),
  ]),
  tbl('Success Rate Ranges', ['Fusion Tier', 'Success Rate', 'Protection Available'], [
    ['Basic fusions', '80-100%', 'Not needed'],
    ['Advanced fusions', '50-70%', 'Yes'],
    ['High-tier fusions', '30-50%', 'Yes (recommended)'],
    ['Endgame fusions', '10-30%', 'Essential'],
  ]),
  callout('tip', [
    p('Always check if a success rate booster is available before attempting high-value fusions. The cost of the booster is usually worth the saved materials.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// D-UNIT (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('d-unit', [
  richText([
    h2('D-Unit System'),
    p('D-Units (Digimon Units) are enhancement modules that can be equipped on your Digimon to provide additional stat bonuses. They are a key part of endgame character optimization.'),
  ]),
  tbl('D-Unit Types', ['Type', 'Primary Stat', 'Best For'], [
    ['Attack D-Unit', 'AT (Attack Power)', 'DPS Digimon'],
    ['Defense D-Unit', 'DE (Defense)', 'Tank Digimon'],
    ['HP D-Unit', 'HP (Hit Points)', 'All builds'],
    ['Critical D-Unit', 'CT (Critical Rate)', 'Burst damage builds'],
    ['Speed D-Unit', 'AS (Attack Speed)', 'Speed-focused builds'],
  ]),
  richText([
    h3('How to Equip'),
    ul(
      'Open your Digimon\'s equipment panel',
      'Navigate to the D-Unit slots',
      'Place D-Units into the available slots',
      'Each Digimon has a limited number of D-Unit slots',
      'D-Units can be removed and swapped freely'
    ),
    empty(),
    h3('Obtaining D-Units'),
    ul(
      'Drop from dungeon bosses',
      'Crafted via Digital Fusion',
      'Purchased from the Arena Shop',
      'Event rewards',
      'D-Unit Fusion (combining lower-tier D-Units)'
    ),
  ]),
  callout('info', [
    p('D-Units are the final layer of stat optimization. Combined with Seals and the Deck System, they form the core enhancement trio for endgame builds.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// D-UNIT HACKING (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('d-unit-hacking', [
  richText([
    h2('D-Unit Hacking'),
    p('D-Unit Hacking is the process of re-rolling or modifying the stats on a D-Unit to optimize its bonuses. This is essential for min-maxing your Digimon\'s performance.'),
    empty(),
    h3('How It Works'),
    ul(
      'Take your D-Unit to the Hacking NPC or use a Hacking item',
      'Select the D-Unit you want to hack',
      'Pay the required materials and currency',
      'The D-Unit\'s sub-stats are re-rolled randomly',
      'You can choose to keep the new stats or revert to the old ones'
    ),
  ]),
  tbl('Hacking Materials', ['Material', 'Source', 'Purpose'], [
    ['Hacking Program', 'Dungeons, events', 'Required for each attempt'],
    ['Currency (Bits/Mega)', 'General income', 'Fee per attempt'],
    ['Special Hacking Chips', 'Rare drops, events', 'Guaranteed stat improvements'],
  ]),
  richText([
    h3('Optimization Strategy'),
    ul(
      'Focus on the stats that matter most for your Digimon\'s role',
      'AT% and CT% are generally the most valuable offensive stats',
      'HP% is universally useful for survivability',
      'Save guaranteed hacking chips for high-value D-Units',
      'Keep track of your best roll — don\'t accidentally overwrite it'
    ),
  ]),
  callout('warning', [
    p('Always review the new stats before confirming! Once you accept the new roll, the previous stats are lost permanently.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// D-UNIT FUSION (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('d-unit-fusion', [
  richText([
    h2('D-Unit Fusion'),
    p('D-Unit Fusion allows tamers to combine two D-Units to create a stronger one. This is the primary way to upgrade D-Units to higher tiers.'),
    empty(),
    h3('Fusion Process'),
    ul(
      'Select a base D-Unit (this determines the result type)',
      'Select a material D-Unit (consumed in the process)',
      'Pay the fusion fee',
      'The base D-Unit may level up or gain enhanced stats on success',
      'On failure, the material D-Unit is consumed but the base remains unchanged'
    ),
  ]),
  tbl('Success Rates by Tier', ['Fusion', 'Success Rate', 'Risk Level'], [
    ['Tier 1 \u2192 Tier 2', '~70%', 'Low'],
    ['Tier 2 \u2192 Tier 3', '~50%', 'Medium'],
    ['Tier 3 \u2192 Tier 4', '~30%', 'High'],
    ['Tier 4 \u2192 Tier 5', '~15%', 'Very High'],
  ]),
  callout('tip', [
    p('Use low-tier D-Units as fusion material to save costs. The material D-Unit\'s stats don\'t affect the result — only its tier matters. Protection items can prevent degradation on failure.'),
  ]),
]);

// ═══════════════════════════════════════════════════════════════════
// DIGIMON BREAKTHROUGH (enhanced)
// ═══════════════════════════════════════════════════════════════════
updateSystem('digimon-breakthrough', [
  richText([
    h2('Digimon Breakthrough'),
    p('The Breakthrough system allows tamers to push their Digimon beyond normal stat limits, providing permanent stat increases that make a significant difference in combat.'),
    empty(),
    h3('How It Works'),
    ul(
      'Select a Digimon that is eligible for Breakthrough',
      'Gather the required Breakthrough materials',
      'Each Breakthrough level requires more materials than the previous one',
      'Successful Breakthrough permanently increases base stats',
      'Multiple Breakthrough levels are available (BT1, BT2, BT3, etc.)'
    ),
  ]),
  tbl('Breakthrough Levels', ['Level', 'Stat Boost', 'Difficulty'], [
    ['BT1', 'Moderate HP + AT increase', 'Beginner-friendly'],
    ['BT2', 'Further HP + AT, plus DE bonus', 'Moderate materials'],
    ['BT3', 'Significant all-stat increase', 'Expensive materials'],
    ['BT4+', 'Major stat increases', 'Endgame, rare materials'],
  ]),
  richText([
    h3('Requirements'),
    ul(
      'Digimon must be at maximum level for its current stage',
      'Specific Breakthrough materials (vary by Digimon)',
      'Currency fee increases with each level',
      'Some levels require rare materials from dungeons or events'
    ),
  ]),
  callout('info', [
    p('Breakthrough is one of the most impactful progression systems. Prioritize your main Digimon\'s Breakthrough over spreading materials across multiple Digimon.'),
  ]),
]);

print('\nTotal updated: ' + updated + ' systems');
