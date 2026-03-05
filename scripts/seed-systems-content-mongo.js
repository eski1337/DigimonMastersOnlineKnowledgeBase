// =============================================================================
// Seed all Game Systems with comprehensive layout content — via mongosh
// Run on VPS: mongosh mongodb://localhost:27017/dmo-kb scripts/seed-systems-content-mongo.js
// =============================================================================

// ── Slate helpers ────────────────────────────────────────────────────────────
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

// ── System content ───────────────────────────────────────────────────────────
var SYSTEMS = {
  'chat-commands': {
    summary: 'Overview of all available chat commands in DMO.',
    tags: [{tag:'System'},{tag:'Communication'}],
    layout: [
      richText([
        h2('Chat Commands'),
        p('Digimon Masters Online has a variety of chat commands to communicate with other players, manage your party, and access game features quickly.'),
        empty(),
        h3('General Chat'),
        ul(
          [B('/s '), {text:'or '}, B('/shout '), {text:'— Shout message visible to all players in the map'}],
          [B('/w [name] [msg]'), {text:' or '}, B('/whisper'), {text:' — Private message to a specific player'}],
          [B('/r [msg]'), {text:' — Reply to the last whisper received'}],
          [B('/p [msg]'), {text:' — Party chat, visible only to party members'}],
          [B('/g [msg]'), {text:' — Guild chat, visible only to guild members'}]
        ),
        empty(),
        h3('Social Commands'),
        ul(
          [B('/invite [name]'), {text:' — Invite a player to your party'}],
          [B('/trade [name]'), {text:' — Send a trade request to a player'}],
          [B('/block [name]'), {text:' — Block a player\'s messages'}],
          [B('/unblock [name]'), {text:' — Unblock a previously blocked player'}],
          [B('/friend [name]'), {text:' — Add a player to your friends list'}]
        ),
        empty(),
        h3('Utility Commands'),
        ul(
          [B('/where'), {text:' — Shows your current map and coordinates'}],
          [B('/time'), {text:' — Shows the current server time'}],
          [B('/sit'), {text:' — Make your character sit down'}],
          [B('/dance'), {text:' — Make your character dance'}]
        ),
        empty(),
        h3('Guild Commands'),
        ul(
          [B('/guild invite [name]'), {text:' — Invite a player to your guild'}],
          [B('/guild leave'), {text:' — Leave your current guild'}],
          [B('/guild info'), {text:' — Display guild information'}]
        ),
      ]),
      callout('tip', [
        p('You can click on a player\'s name in chat to quickly whisper them. Most commands also work with partial player names.'),
      ]),
    ],
  },

  'currency': {
    summary: 'All currency types and how to obtain them.',
    tags: [{tag:'System'},{tag:'Economy'}],
    layout: [
      richText([
        h2('Currency System'),
        p('DMO uses multiple currency types for different purposes. Understanding the economy is essential for progression.'),
      ]),
      tbl('Currency Types', ['Currency', 'How to Obtain', 'Primary Use'], [
        ['Bit (B)', 'Monster drops, quests, selling items', 'Basic purchases, NPC shops'],
        ['Mega (M)', '1,000 Bits = 1 Mega', 'Mid-tier purchases'],
        ['Tera (T)', '1,000 Mega = 1 Tera', 'High-value items, trading'],
        ['Crown (C)', 'Cash shop (real money)', 'Premium items, Cash Shop'],
        ['DigiCore', 'Daily dungeons, events', 'Evolution items, special NPCs'],
        ['Arena Coins', 'PvP Arena participation', 'Arena shop rewards'],
        ['Seal Coins', 'Seal Master activities', 'Seal upgrades and materials'],
        ['Event Tokens', 'Seasonal events', 'Event-exclusive items'],
      ]),
      richText([
        empty(),
        h3('Economy Tips'),
        ul(
          'The primary trading currency between players is Tera (T)',
          'Crown items can often be traded on the player market',
          'Daily dungeons are the most reliable source of DigiCore',
          'Event tokens typically expire when the event ends — spend them before the deadline',
          'Some currencies are account-bound while others are character-bound'
        ),
      ]),
      callout('info', [
        p(B('Exchange Rate: '), {text:'1 Tera (T) = 1,000 Mega (M) = 1,000,000 Bit (B). The in-game currency display shows all three denominations.'}),
      ]),
    ],
  },

  'deck-system': {
    summary: 'Guide to the Deck system and card bonuses.',
    tags: [{tag:'System'},{tag:'Collection'}],
    layout: [
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
        empty(),
        h3('Card Grades'),
        p('Cards come in different grades that determine their stat bonus strength:'),
        ul('Normal — Base stats', 'Rare — 1.5x bonus', 'Epic — 2x bonus', 'Legendary — 3x bonus'),
      ]),
      callout('tip', [
        p('Focus on completing full family sets first, as the set bonus often outweighs individual card stats. Check your Deck collection regularly to see which cards you\'re missing.'),
      ]),
    ],
  },

  'digimon-arena': {
    summary: 'PvP Arena rules, rankings, and rewards.',
    tags: [{tag:'System'},{tag:'PvP'},{tag:'Arena'}],
    layout: [
      richText([
        h2('Digimon Arena'),
        p('The Digimon Arena is the primary PvP system in DMO, allowing tamers to battle each other for rankings, rewards, and bragging rights.'),
        empty(),
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
    ],
  },

  'digimon-attribute-arena': {
    summary: 'Attribute-based Arena challenges and rewards.',
    tags: [{tag:'System'},{tag:'PvP'},{tag:'Arena'}],
    layout: [
      richText([
        h2('Digimon Attribute Arena'),
        p('The Attribute Arena is a specialized PvP mode that restricts participation based on Digimon attributes (Vaccine, Data, Virus, Free). Each period focuses on specific attributes.'),
        empty(),
        h3('How It Works'),
        ul(
          'Only Digimon with the matching attribute can participate during each rotation',
          'Rotations change on a regular schedule (typically weekly)',
          'The attribute triangle applies: Vaccine > Virus > Data > Vaccine',
          'Free attribute can participate in any rotation but has no type advantage'
        ),
        empty(),
        h3('Rewards'),
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
    ],
  },

  'guild': {
    summary: 'Guild creation, management, and guild-exclusive features.',
    tags: [{tag:'System'},{tag:'Social'},{tag:'Guild'}],
    layout: [
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
        empty(),
        h3('Guild Ranks'),
        ul(
          [B('Guild Master'), {text:' — Full control over guild settings, can promote/demote and disband'}],
          [B('Vice Master'), {text:' — Can invite/kick members, manage some settings'}],
          [B('Officer'), {text:' — Can invite members'}],
          [B('Member'), {text:' — Standard membership'}]
        ),
        empty(),
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
        p('As your guild levels up, you unlock:'),
        ul(
          'Increased maximum member capacity',
          'Stronger guild-wide stat buffs',
          'Access to higher-tier guild raids',
          'Additional guild storage slots',
          'Cosmetic guild features (emblems, badges)'
        ),
      ]),
    ],
  },

  'instance-dungeons': {
    summary: 'All instance dungeons, entry requirements, and loot.',
    tags: [{tag:'System'},{tag:'PvE'},{tag:'Dungeons'}],
    layout: [
      richText([
        h2('Instance Dungeons'),
        p('Instance Dungeons are private, instanced PvE content that tamers can enter solo or in a party. They offer exclusive loot, evolution materials, and challenging boss fights.'),
        empty(),
        h3('General Mechanics'),
        ul(
          'Each dungeon has entry requirements (level, items, daily limits)',
          'Dungeons are instanced — your party gets a private copy',
          'Most dungeons have daily or weekly entry limits',
          'Higher difficulty = better loot but tougher enemies',
          'Party size varies by dungeon (solo, 3-player, 5-player)'
        ),
        empty(),
        h3('Dungeon Types'),
        ul(
          [B('Story Dungeons'), {text:' — Follow the main storyline, lower difficulty'}],
          [B('Daily Dungeons'), {text:' — Repeatable content with daily entry limits, primary source of DigiCore'}],
          [B('Raid Dungeons'), {text:' — Group content requiring coordinated parties, best loot'}],
          [B('Event Dungeons'), {text:' — Time-limited dungeons available during special events'}],
          [B('Challenge Dungeons'), {text:' — Endgame content with extreme difficulty and exclusive rewards'}]
        ),
        empty(),
        h3('Tips'),
        ul(
          'Always check entry requirements before attempting a dungeon',
          'Bring appropriate consumables (HP/DS recovery items)',
          'Some bosses have specific mechanics — learn the patterns',
          'Party composition matters for harder dungeons',
          'Daily dungeons should be done every day for maximum DigiCore income'
        ),
      ]),
      callout('info', [
        p('Instance Dungeon entry counts typically reset at midnight server time. Check the dungeon NPC or UI for remaining entries.'),
      ]),
    ],
  },

  'quests': {
    summary: 'Quest system overview, types, and completion tips.',
    tags: [{tag:'System'},{tag:'PvE'},{tag:'Quests'}],
    layout: [
      richText([
        h2('Quest System'),
        p('Quests are structured objectives that guide tamers through the game world, providing EXP, items, currency, and story progression.'),
        empty(),
        h3('Quest Types'),
        ul(
          [B('Main Quests'), {text:' — Story-driven quests that progress the narrative and unlock new maps/features'}],
          [B('Side Quests'), {text:' — Optional quests that provide additional rewards and world-building'}],
          [B('Daily Quests'), {text:' — Repeatable quests that reset daily, great for steady income'}],
          [B('Repeatable Quests'), {text:' — Can be completed multiple times without daily limits'}],
          [B('Event Quests'), {text:' — Time-limited quests during special events'}],
          [B('Tamer Quests'), {text:' — Tamer-specific progression quests for leveling'}]
        ),
        empty(),
        h3('Quest Rewards'),
        ul(
          'EXP — For both Tamer and Digimon',
          'Currency — Bits, Mega, or special tokens',
          'Items — Equipment, consumables, materials',
          'Evolution Materials — Key items for Digimon evolution',
          'Titles — Some quests grant unique titles',
          'Map Access — Completing main quests unlocks new areas'
        ),
        empty(),
        h3('Tips'),
        ul(
          'Always pick up daily quests — they compound over time',
          'Main quests should be prioritized for map and feature unlocks',
          'Some quests have level requirements — check before attempting',
          'Quest NPCs are marked on the minimap with special icons',
          'Event quests often have the best reward-to-effort ratio'
        ),
      ]),
    ],
  },

  'rare-machine': {
    summary: 'Rare Machine gacha system and available prizes.',
    tags: [{tag:'System'},{tag:'Gacha'}],
    layout: [
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
        empty(),
        h3('Machine Types'),
        ul(
          [B('Normal Rare Machine'), {text:' — Uses standard tokens, common to rare prizes'}],
          [B('Premium Rare Machine'), {text:' — Uses premium tokens or Crown, better prize pools'}],
          [B('Event Rare Machine'), {text:' — Available during events with exclusive prizes'}],
          [B('Mileage System'), {text:' — Accumulate mileage points from pulls for guaranteed rewards'}]
        ),
        empty(),
        h3('Tips'),
        ul(
          'Check the prize pool before spending — some rotations are better than others',
          'Mileage points carry over within the same machine rotation',
          'Event machines often have the best value items',
          'Set a spending limit to avoid overspending'
        ),
      ]),
      callout('warning', [
        p('The Rare Machine is a gacha system with randomized rewards. Rates for top-tier items are typically very low. Spend responsibly.'),
      ]),
    ],
  },

  'seal-master': {
    summary: 'Seal Master system, seal types, and upgrade paths.',
    tags: [{tag:'System'},{tag:'Enhancement'}],
    layout: [
      richText([
        h2('Seal Master'),
        p('The Seal Master system allows tamers to equip seals on their Digimon for additional stat bonuses. Seals can be upgraded and combined for stronger effects.'),
        empty(),
        h3('Seal Types'),
        ul(
          [B('Leader Seal'), {text:' — Provides leadership-based bonuses (AT, CT)'}],
          [B('Soul Seal'), {text:' — Provides defensive bonuses (HP, DE, EV)'}],
          [B('Attack Seal'), {text:' — Pure offensive stats (AT, AS)'}],
          [B('Defense Seal'), {text:' — Pure defensive stats (DE, HP, BL)'}]
        ),
        empty(),
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
    ],
  },

  'titles': {
    summary: 'All obtainable titles and their requirements.',
    tags: [{tag:'System'},{tag:'Collection'},{tag:'Titles'}],
    layout: [
      richText([
        h2('Titles'),
        p('Titles are cosmetic (and sometimes stat-boosting) labels that appear above or beside your tamer name. They are earned through various achievements, events, and progression milestones.'),
        empty(),
        h3('Title Categories'),
        ul(
          [B('Combat Titles'), {text:' — Earned by defeating specific bosses or reaching combat milestones'}],
          [B('Collection Titles'), {text:' — Earned by completing card sets, scanning Digimon, etc.'}],
          [B('Achievement Titles'), {text:' — Earned by reaching progression milestones (levels, quests)'}],
          [B('Arena Titles'), {text:' — Earned through PvP rankings'}],
          [B('Event Titles'), {text:' — Time-limited titles from seasonal events'}],
          [B('Special Titles'), {text:' — Unique titles from special promotions or contests'}]
        ),
        empty(),
        h3('Title Bonuses'),
        p('Some titles provide stat bonuses when equipped:'),
        ul(
          'AT (Attack) bonuses — from combat titles',
          'HP bonuses — from endurance/survival titles',
          'CT (Critical) bonuses — from collection completion titles',
          'All-stat bonuses — from prestigious achievement titles'
        ),
        empty(),
        h3('How to Equip'),
        ul(
          'Open the Title menu from your character panel',
          'Select the title you want to display',
          'Only one title can be active at a time',
          'The stat bonus of the equipped title is always active'
        ),
      ]),
    ],
  },

  'digital-draw': {
    summary: 'Digital Draw lottery system and prize pools.',
    tags: [{tag:'System'},{tag:'Gacha'}],
    layout: [
      richText([
        h2('Digital Draw'),
        p('Digital Draw is a lottery-style system where tamers use tickets to draw prizes from rotating prize pools. It operates similarly to a lucky draw or slot machine.'),
        empty(),
        h3('How It Works'),
        ul(
          'Obtain Digital Draw tickets from events, daily login, or the Cash Shop',
          'Use tickets at the Digital Draw machine',
          'Each draw consumes one ticket and awards a random prize',
          'Prize pools change periodically with featured items',
          'Some draws have step-up mechanics with improving odds'
        ),
        empty(),
        h3('Prize Tiers'),
        ul(
          [B('Grand Prize'), {text:' — Ultra-rare items, exclusive Digimon eggs, or premium evolution materials'}],
          [B('1st Prize'), {text:' — Rare items, valuable consumables'}],
          [B('2nd Prize'), {text:' — Uncommon items, useful materials'}],
          [B('3rd Prize'), {text:' — Common items, basic consumables'}],
          [B('Consolation'), {text:' — Minimum reward guaranteed on every draw'}]
        ),
      ]),
      callout('info', [
        p('Check the current prize pool rotation before using your tickets. Some rotations feature significantly better prizes than others.'),
      ]),
    ],
  },

  'digital-fusion': {
    summary: 'Digital Fusion mechanics and recipes.',
    tags: [{tag:'System'},{tag:'Crafting'}],
    layout: [
      richText([
        h2('Digital Fusion'),
        p('Digital Fusion is the crafting/synthesis system in DMO that allows tamers to combine materials and items to create new, more powerful equipment and items.'),
        empty(),
        h3('Fusion Types'),
        ul(
          [B('Item Fusion'), {text:' — Combine materials to create equipment, accessories, and consumables'}],
          [B('Digimon Fusion (Jogress)'), {text:' — Fuse two compatible Digimon into a more powerful form'}],
          [B('Accessory Fusion'), {text:' — Upgrade accessories by combining them with materials'}]
        ),
        empty(),
        h3('How to Fuse'),
        ul(
          'Visit the Fusion NPC or access the fusion menu',
          'Select the recipe/fusion type',
          'Place required materials in the fusion slots',
          'Pay the fusion fee (currency)',
          'Confirm — some fusions have success/failure rates'
        ),
        empty(),
        h3('Success Rates'),
        ul(
          'Basic fusions have high success rates (80-100%)',
          'Advanced fusions may have lower rates (30-70%)',
          'Use success rate boosters to improve odds',
          'Failed fusions may consume materials without creating the result',
          'Some recipes guarantee success but require more materials'
        ),
      ]),
      callout('tip', [
        p('Always check if a success rate booster is available before attempting high-value fusions. The cost of the booster is usually worth the saved materials.'),
      ]),
    ],
  },

  'd-unit': {
    summary: 'D-Unit system overview and stat bonuses.',
    tags: [{tag:'System'},{tag:'Enhancement'}],
    layout: [
      richText([
        h2('D-Unit System'),
        p('D-Units (Digimon Units) are enhancement modules that can be equipped on your Digimon to provide additional stat bonuses. They are a key part of endgame character optimization.'),
        empty(),
        h3('D-Unit Types'),
        ul(
          [B('Attack D-Unit'), {text:' — Increases AT (Attack Power)'}],
          [B('Defense D-Unit'), {text:' — Increases DE (Defense)'}],
          [B('HP D-Unit'), {text:' — Increases HP (Hit Points)'}],
          [B('Critical D-Unit'), {text:' — Increases CT (Critical Rate)'}],
          [B('Speed D-Unit'), {text:' — Increases AS (Attack Speed)'}]
        ),
        empty(),
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
    ],
  },

  'd-unit-hacking': {
    summary: 'D-Unit Hacking process and optimization.',
    tags: [{tag:'System'},{tag:'Enhancement'}],
    layout: [
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
        empty(),
        h3('Hacking Materials'),
        ul(
          'Hacking Program — Required for each hacking attempt',
          'Currency (Bits/Mega) — Fee per attempt',
          'Special Hacking Chips — For guaranteed stat improvements (rare)'
        ),
        empty(),
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
    ],
  },

  'd-unit-fusion': {
    summary: 'D-Unit Fusion mechanics and success rates.',
    tags: [{tag:'System'},{tag:'Enhancement'}],
    layout: [
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
      tbl('Success Rates', ['Fusion', 'Success Rate'], [
        ['Tier 1 to Tier 2', '~70%'],
        ['Tier 2 to Tier 3', '~50%'],
        ['Tier 3 to Tier 4', '~30%'],
        ['Tier 4 to Tier 5', '~15%'],
      ]),
      callout('tip', [
        p('Use low-tier D-Units as fusion material to save costs. The material D-Unit\'s stats don\'t affect the result — only its tier matters for the success rate calculation.'),
      ]),
    ],
  },

  'digimon-breakthrough': {
    summary: 'Breakthrough system for Digimon stat upgrades.',
    tags: [{tag:'System'},{tag:'Enhancement'},{tag:'Breakthrough'}],
    layout: [
      richText([
        h2('Digimon Breakthrough'),
        p('The Breakthrough system allows tamers to push their Digimon beyond their normal stat limits, providing permanent stat increases that make a significant difference in combat.'),
        empty(),
        h3('How It Works'),
        ul(
          'Select a Digimon that is eligible for Breakthrough',
          'Gather the required Breakthrough materials',
          'Each Breakthrough level requires more materials than the previous one',
          'Successful Breakthrough permanently increases the Digimon\'s base stats',
          'Multiple Breakthrough levels are available (BT1, BT2, BT3, etc.)'
        ),
        empty(),
        h3('Requirements'),
        ul(
          'Digimon must be at maximum level for its current stage',
          'Specific Breakthrough materials (vary by Digimon)',
          'Currency fee increases with each level',
          'Some Breakthrough levels require rare materials from dungeons or events'
        ),
        empty(),
        h3('Stat Increases'),
        p('Each Breakthrough level provides scaling stat bonuses:'),
        ul(
          [B('BT1'), {text:' — Moderate increase to HP and AT'}],
          [B('BT2'), {text:' — Further increases plus DE bonus'}],
          [B('BT3'), {text:' — Significant all-stat increase'}],
          [B('BT4+'), {text:' — Major stat increases, endgame territory'}]
        ),
      ]),
      callout('info', [
        p('Breakthrough is one of the most impactful progression systems. Prioritize your main Digimon\'s Breakthrough over spreading materials across multiple Digimon.'),
      ]),
    ],
  },
};

// ── Execute ──────────────────────────────────────────────────────────────────
var now = new Date();
var updated = 0, skipped = 0, failed = 0;
var slugs = Object.keys(SYSTEMS);

for (var i = 0; i < slugs.length; i++) {
  var slug = slugs[i];
  var data = SYSTEMS[slug];
  var doc = db.systems.findOne({slug: slug});

  if (!doc) {
    print('  x ' + slug + ' — not found');
    failed++;
    continue;
  }

  // Skip if already has layout content
  if (doc.layout && doc.layout.length > 0) {
    print('  o ' + slug + ' — already has ' + doc.layout.length + ' blocks, skipping');
    skipped++;
    continue;
  }

  db.systems.updateOne(
    {_id: doc._id},
    {$set: {
      summary: data.summary,
      tags: data.tags,
      layout: data.layout,
      updatedAt: now,
    }}
  );
  print('  + ' + slug + ' — updated with ' + data.layout.length + ' blocks');
  updated++;
}

print('\nDone: ' + updated + ' updated, ' + skipped + ' skipped (had content), ' + failed + ' not found');
