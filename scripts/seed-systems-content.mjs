#!/usr/bin/env node
// =============================================================================
// Seed all Game Systems with comprehensive content
// Run on VPS: cd /home/deploy/app && node scripts/seed-systems-content.mjs
// =============================================================================

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001';
const EMAIL   = process.env.CMS_EMAIL;
const PASS    = process.env.CMS_PASSWORD;

if (!EMAIL || !PASS) {
  console.error('Set CMS_EMAIL and CMS_PASSWORD env vars');
  process.exit(1);
}

// ── Slate helpers ────────────────────────────────────────────────────────────
const h2 = t => ({ type: 'h2', children: [{ text: t }] });
const h3 = t => ({ type: 'h3', children: [{ text: t }] });
const h4 = t => ({ type: 'h4', children: [{ text: t }] });
const p  = (...parts) => ({ children: parts.map(x => typeof x === 'string' ? { text: x } : x) });
const b  = t => ({ text: t, bold: true });
const code = t => ({ text: t, code: true });
const empty = () => ({ children: [{ text: '' }] });
const ul = (...items) => ({
  type: 'ul',
  children: items.map(item => ({
    type: 'li',
    children: [{ children: typeof item === 'string' ? [{ text: item }] : (Array.isArray(item) ? item : [item]) }],
  })),
});

const richText = (content) => ({ blockType: 'richText', content });
const callout = (type, content) => ({ blockType: 'callout', type, content });
const table = (title, headers, rows) => ({
  blockType: 'table',
  title,
  headers: headers.map(h => ({ label: h })),
  rows: rows.map(cells => ({ cells: cells.map(v => ({ value: String(v) })) })),
});

// ── System data ──────────────────────────────────────────────────────────────

const SYSTEMS = {
  'chat-commands': {
    summary: 'Overview of all available chat commands in DMO.',
    tags: ['System', 'Communication'],
    layout: [
      richText([
        h2('Chat Commands'),
        p('Digimon Masters Online has a variety of chat commands to communicate with other players, manage your party, and access game features quickly.'),
        empty(),
        h3('General Chat'),
        ul(
          [b('/s '), { text: 'or ' }, b('/shout '), { text: '— Shout message visible to all players in the map' }],
          [b('/w [name] [msg]'), { text: ' or ' }, b('/whisper'), { text: ' — Private message to a specific player' }],
          [b('/r [msg]'), { text: ' — Reply to the last whisper received' }],
          [b('/p [msg]'), { text: ' — Party chat, visible only to party members' }],
          [b('/g [msg]'), { text: ' — Guild chat, visible only to guild members' }],
        ),
        empty(),
        h3('Social Commands'),
        ul(
          [b('/invite [name]'), { text: ' — Invite a player to your party' }],
          [b('/trade [name]'), { text: ' — Send a trade request to a player' }],
          [b('/block [name]'), { text: ' — Block a player\'s messages' }],
          [b('/unblock [name]'), { text: ' — Unblock a previously blocked player' }],
          [b('/friend [name]'), { text: ' — Add a player to your friends list' }],
        ),
        empty(),
        h3('Utility Commands'),
        ul(
          [b('/where'), { text: ' — Shows your current map and coordinates' }],
          [b('/time'), { text: ' — Shows the current server time' }],
          [b('/sit'), { text: ' — Make your character sit down' }],
          [b('/dance'), { text: ' — Make your character dance' }],
        ),
        empty(),
        h3('Guild Commands'),
        ul(
          [b('/guild invite [name]'), { text: ' — Invite a player to your guild' }],
          [b('/guild leave'), { text: ' — Leave your current guild' }],
          [b('/guild info'), { text: ' — Display guild information' }],
        ),
      ]),
      callout('tip', [
        p('You can click on a player\'s name in chat to quickly whisper them. Most commands also work with partial player names.'),
      ]),
    ],
  },

  'currency': {
    summary: 'All currency types and how to obtain them.',
    tags: ['System', 'Economy'],
    layout: [
      richText([
        h2('Currency System'),
        p('DMO uses multiple currency types for different purposes. Understanding the economy is essential for progression.'),
      ]),
      table('Currency Types', ['Currency', 'How to Obtain', 'Primary Use'], [
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
          'Some currencies are account-bound while others are character-bound',
        ),
      ]),
      callout('info', [
        p(b('Exchange Rate: '), { text: '1 Tera (T) = 1,000 Mega (M) = 1,000,000 Bit (B). The in-game currency display shows all three denominations.' }),
      ]),
    ],
  },

  'deck-system': {
    summary: 'Guide to the Deck system and card bonuses.',
    tags: ['System', 'Collection'],
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
          'Multiple deck pages can be configured for different setups',
        ),
        empty(),
        h3('Obtaining Cards'),
        ul(
          'Defeat a Digimon and use the Scan function',
          'Cards drop based on RNG — rarer Digimon have lower scan rates',
          'Some cards are only available from dungeon bosses or events',
          'Duplicate cards can be used to level up existing cards for stronger bonuses',
        ),
        empty(),
        h3('Card Grades'),
        p('Cards come in different grades that determine their stat bonus strength:'),
        ul('Normal — Base stats', 'Rare — 1.5× bonus', 'Epic — 2× bonus', 'Legendary — 3× bonus'),
      ]),
      callout('tip', [
        p('Focus on completing full family sets first, as the set bonus often outweighs individual card stats. Check your Deck collection regularly to see which cards you\'re missing.'),
      ]),
    ],
  },

  'digimon-arena': {
    summary: 'PvP Arena rules, rankings, and rewards.',
    tags: ['System', 'PvP', 'Arena'],
    layout: [
      richText([
        h2('Digimon Arena'),
        p('The Digimon Arena is the primary PvP system in DMO, allowing tamers to battle each other for rankings, rewards, and bragging rights.'),
        empty(),
        h3('Arena Modes'),
        ul(
          [b('1v1 Arena'), { text: ' — Solo battles between two tamers and their Digimon' }],
          [b('Tag Arena'), { text: ' — Team-based battles with multiple tamers per side' }],
          [b('Ranked Arena'), { text: ' — Competitive mode with seasonal rankings and exclusive rewards' }],
        ),
        empty(),
        h3('Rules & Mechanics'),
        ul(
          'Level and stat balancing may apply in certain modes',
          'Cooldowns and skill usage follow PvP-specific rules',
          'Matches have a time limit — if time runs out, the player with more HP% wins',
          'Some skills have reduced effectiveness in PvP',
          'Burst Mode and Jogress are allowed in most modes',
        ),
        empty(),
        h3('Rewards'),
        ul(
          'Arena Coins — earned per match (more for wins)',
          'Seasonal ranking rewards (titles, exclusive items)',
          'Arena Shop — spend Arena Coins on evolution materials, accessories, and more',
          'Special titles for reaching specific ranks',
        ),
      ]),
      callout('warning', [
        p('Arena rankings reset each season. Make sure to claim your seasonal rewards before the reset!'),
      ]),
    ],
  },

  'digimon-attribute-arena': {
    summary: 'Attribute-based Arena challenges and rewards.',
    tags: ['System', 'PvP', 'Arena'],
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
          'Free attribute can participate in any rotation but has no type advantage',
        ),
        empty(),
        h3('Rewards'),
        ul(
          'Attribute Arena Coins — unique currency for this mode',
          'Exclusive accessories and costumes available only through this arena',
          'Ranking titles specific to Attribute Arena',
          'Special evolution materials for certain Digimon',
        ),
      ]),
      callout('tip', [
        p('Prepare Digimon of all three main attributes so you can participate in every rotation. Free attribute Digimon are versatile but lack the damage bonus from type advantage.'),
      ]),
    ],
  },

  'guild': {
    summary: 'Guild creation, management, and guild-exclusive features.',
    tags: ['System', 'Social', 'Guild'],
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
          'Initial member capacity starts small and can be expanded',
        ),
        empty(),
        h3('Guild Ranks'),
        ul(
          [b('Guild Master'), { text: ' — Full control over guild settings, can promote/demote and disband' }],
          [b('Vice Master'), { text: ' — Can invite/kick members, manage some settings' }],
          [b('Officer'), { text: ' — Can invite members' }],
          [b('Member'), { text: ' — Standard membership' }],
        ),
        empty(),
        h3('Guild Features'),
        ul(
          [b('Guild Chat'), { text: ' — Private communication channel for guild members' }],
          [b('Guild Buffs'), { text: ' — Passive stat bonuses that apply to all online members' }],
          [b('Guild Raids'), { text: ' — Cooperative boss battles exclusive to guild members' }],
          [b('Guild Level'), { text: ' — Guilds level up through member contributions, unlocking perks' }],
          [b('Guild Storage'), { text: ' — Shared inventory for trading items between members' }],
        ),
        empty(),
        h3('Guild Level Benefits'),
        p('As your guild levels up, you unlock:'),
        ul(
          'Increased maximum member capacity',
          'Stronger guild-wide stat buffs',
          'Access to higher-tier guild raids',
          'Additional guild storage slots',
          'Cosmetic guild features (emblems, badges)',
        ),
      ]),
    ],
  },

  'instance-dungeons': {
    summary: 'All instance dungeons, entry requirements, and loot.',
    tags: ['System', 'PvE', 'Dungeons'],
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
          'Party size varies by dungeon (solo, 3-player, 5-player)',
        ),
        empty(),
        h3('Dungeon Types'),
        ul(
          [b('Story Dungeons'), { text: ' — Follow the main storyline, lower difficulty' }],
          [b('Daily Dungeons'), { text: ' — Repeatable content with daily entry limits, primary source of DigiCore' }],
          [b('Raid Dungeons'), { text: ' — Group content requiring coordinated parties, best loot' }],
          [b('Event Dungeons'), { text: ' — Time-limited dungeons available during special events' }],
          [b('Challenge Dungeons'), { text: ' — Endgame content with extreme difficulty and exclusive rewards' }],
        ),
        empty(),
        h3('Tips'),
        ul(
          'Always check entry requirements before attempting a dungeon',
          'Bring appropriate consumables (HP/DS recovery items)',
          'Some bosses have specific mechanics — learn the patterns',
          'Party composition matters for harder dungeons',
          'Daily dungeons should be done every day for maximum DigiCore income',
        ),
      ]),
      callout('info', [
        p('Instance Dungeon entry counts typically reset at midnight server time. Check the dungeon NPC or UI for remaining entries.'),
      ]),
    ],
  },

  'monster-card': {
    summary: 'Monster Card collection, effects, and how to obtain them.',
    tags: ['System', 'Collection', 'Monster Card'],
    layout: [
      richText([
        h2('Monster Card System'),
        p('Monster Cards are collectible cards that summon wild Digimon for your tamer to battle. They come in different tiers with varying rewards and difficulty levels.'),
        empty(),
        p(b('For the full detailed breakdown with all tiers, drops, and images, see the '), { text: 'dedicated Monster Card page.' }),
      ]),
      callout('info', [
        p('Visit the dedicated ', b('Monster Card page'), { text: ' at /systems/monster-card for the complete tier breakdown, drop tables, old cards, and more.' }),
      ]),
    ],
  },

  'quests': {
    summary: 'Quest system overview, types, and completion tips.',
    tags: ['System', 'PvE', 'Quests'],
    layout: [
      richText([
        h2('Quest System'),
        p('Quests are structured objectives that guide tamers through the game world, providing EXP, items, currency, and story progression.'),
        empty(),
        h3('Quest Types'),
        ul(
          [b('Main Quests'), { text: ' — Story-driven quests that progress the narrative and unlock new maps/features' }],
          [b('Side Quests'), { text: ' — Optional quests that provide additional rewards and world-building' }],
          [b('Daily Quests'), { text: ' — Repeatable quests that reset daily, great for steady income' }],
          [b('Repeatable Quests'), { text: ' — Can be completed multiple times without daily limits' }],
          [b('Event Quests'), { text: ' — Time-limited quests during special events' }],
          [b('Tamer Quests'), { text: ' — Tamer-specific progression quests for leveling' }],
        ),
        empty(),
        h3('Quest Rewards'),
        ul(
          'EXP — For both Tamer and Digimon',
          'Currency — Bits, Mega, or special tokens',
          'Items — Equipment, consumables, materials',
          'Evolution Materials — Key items for Digimon evolution',
          'Titles — Some quests grant unique titles',
          'Map Access — Completing main quests unlocks new areas',
        ),
        empty(),
        h3('Tips'),
        ul(
          'Always pick up daily quests — they compound over time',
          'Main quests should be prioritized for map and feature unlocks',
          'Some quests have level requirements — check before attempting',
          'Quest NPCs are marked on the minimap with special icons',
          'Event quests often have the best reward-to-effort ratio',
        ),
      ]),
    ],
  },

  'rare-machine': {
    summary: 'Rare Machine gacha system and available prizes.',
    tags: ['System', 'Gacha'],
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
          'Some machines have guaranteed jackpot mechanics after a certain number of tries',
        ),
        empty(),
        h3('Machine Types'),
        ul(
          [b('Normal Rare Machine'), { text: ' — Uses standard tokens, common to rare prizes' }],
          [b('Premium Rare Machine'), { text: ' — Uses premium tokens or Crown, better prize pools' }],
          [b('Event Rare Machine'), { text: ' — Available during events with exclusive prizes' }],
          [b('Mileage System'), { text: ' — Accumulate mileage points from pulls for guaranteed rewards' }],
        ),
        empty(),
        h3('Tips'),
        ul(
          'Check the prize pool before spending — some rotations are better than others',
          'Mileage points carry over within the same machine rotation',
          'Event machines often have the best value items',
          'Set a spending limit to avoid overspending',
        ),
      ]),
      callout('warning', [
        p('The Rare Machine is a gacha system with randomized rewards. Rates for top-tier items are typically very low. Spend responsibly.'),
      ]),
    ],
  },

  'seal-master': {
    summary: 'Seal Master system, seal types, and upgrade paths.',
    tags: ['System', 'Enhancement'],
    layout: [
      richText([
        h2('Seal Master'),
        p('The Seal Master system allows tamers to equip seals on their Digimon for additional stat bonuses. Seals can be upgraded and combined for stronger effects.'),
        empty(),
        h3('Seal Types'),
        ul(
          [b('Leader Seal'), { text: ' — Provides leadership-based bonuses (AT, CT)' }],
          [b('Soul Seal'), { text: ' — Provides defensive bonuses (HP, DE, EV)' }],
          [b('Attack Seal'), { text: ' — Pure offensive stats (AT, AS)' }],
          [b('Defense Seal'), { text: ' — Pure defensive stats (DE, HP, BL)' }],
        ),
        empty(),
        h3('How to Use'),
        ul(
          'Visit the Seal Master NPC in town',
          'Equip seals into the available seal slots on your Digimon',
          'Each Digimon has limited seal slots',
          'Seals can be removed and re-equipped freely',
        ),
        empty(),
        h3('Upgrading Seals'),
        ul(
          'Combine lower-grade seals to create higher-grade ones',
          'Upgrade success is not guaranteed — higher tiers have lower success rates',
          'Use protection items to prevent seal destruction on failure',
          'Seal materials can be obtained from dungeons, events, and the Seal Shop',
        ),
      ]),
      callout('tip', [
        p('Focus on maxing one seal type that complements your Digimon\'s role before diversifying. Attack seals for DPS Digimon, Defense seals for tanks.'),
      ]),
    ],
  },

  'titles': {
    summary: 'All obtainable titles and their requirements.',
    tags: ['System', 'Collection', 'Titles'],
    layout: [
      richText([
        h2('Titles'),
        p('Titles are cosmetic (and sometimes stat-boosting) labels that appear above or beside your tamer name. They are earned through various achievements, events, and progression milestones.'),
        empty(),
        h3('Title Categories'),
        ul(
          [b('Combat Titles'), { text: ' — Earned by defeating specific bosses or reaching combat milestones' }],
          [b('Collection Titles'), { text: ' — Earned by completing card sets, scanning Digimon, etc.' }],
          [b('Achievement Titles'), { text: ' — Earned by reaching progression milestones (levels, quests)' }],
          [b('Arena Titles'), { text: ' — Earned through PvP rankings' }],
          [b('Event Titles'), { text: ' — Time-limited titles from seasonal events' }],
          [b('Special Titles'), { text: ' — Unique titles from special promotions or contests' }],
        ),
        empty(),
        h3('Title Bonuses'),
        p('Some titles provide stat bonuses when equipped:'),
        ul(
          'AT (Attack) bonuses — from combat titles',
          'HP bonuses — from endurance/survival titles',
          'CT (Critical) bonuses — from collection completion titles',
          'All-stat bonuses — from prestigious achievement titles',
        ),
        empty(),
        h3('How to Equip'),
        ul(
          'Open the Title menu from your character panel',
          'Select the title you want to display',
          'Only one title can be active at a time',
          'The stat bonus of the equipped title is always active',
        ),
      ]),
    ],
  },

  'digital-draw': {
    summary: 'Digital Draw lottery system and prize pools.',
    tags: ['System', 'Gacha'],
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
          'Some draws have step-up mechanics with improving odds',
        ),
        empty(),
        h3('Prize Tiers'),
        ul(
          [b('Grand Prize'), { text: ' — Ultra-rare items, exclusive Digimon eggs, or premium evolution materials' }],
          [b('1st Prize'), { text: ' — Rare items, valuable consumables' }],
          [b('2nd Prize'), { text: ' — Uncommon items, useful materials' }],
          [b('3rd Prize'), { text: ' — Common items, basic consumables' }],
          [b('Consolation'), { text: ' — Minimum reward guaranteed on every draw' }],
        ),
      ]),
      callout('info', [
        p('Check the current prize pool rotation before using your tickets. Some rotations feature significantly better prizes than others.'),
      ]),
    ],
  },

  'digital-fusion': {
    summary: 'Digital Fusion mechanics and recipes.',
    tags: ['System', 'Crafting'],
    layout: [
      richText([
        h2('Digital Fusion'),
        p('Digital Fusion is the crafting/synthesis system in DMO that allows tamers to combine materials and items to create new, more powerful equipment and items.'),
        empty(),
        h3('Fusion Types'),
        ul(
          [b('Item Fusion'), { text: ' — Combine materials to create equipment, accessories, and consumables' }],
          [b('Digimon Fusion (Jogress)'), { text: ' — Fuse two compatible Digimon into a more powerful form' }],
          [b('Accessory Fusion'), { text: ' — Upgrade accessories by combining them with materials' }],
        ),
        empty(),
        h3('How to Fuse'),
        ul(
          'Visit the Fusion NPC or access the fusion menu',
          'Select the recipe/fusion type',
          'Place required materials in the fusion slots',
          'Pay the fusion fee (currency)',
          'Confirm — some fusions have success/failure rates',
        ),
        empty(),
        h3('Success Rates'),
        ul(
          'Basic fusions have high success rates (80-100%)',
          'Advanced fusions may have lower rates (30-70%)',
          'Use success rate boosters to improve odds',
          'Failed fusions may consume materials without creating the result',
          'Some recipes guarantee success but require more materials',
        ),
      ]),
      callout('tip', [
        p('Always check if a success rate booster is available before attempting high-value fusions. The cost of the booster is usually worth the saved materials.'),
      ]),
    ],
  },

  'd-unit': {
    summary: 'D-Unit system overview and stat bonuses.',
    tags: ['System', 'Enhancement'],
    layout: [
      richText([
        h2('D-Unit System'),
        p('D-Units (Digimon Units) are enhancement modules that can be equipped on your Digimon to provide additional stat bonuses. They are a key part of endgame character optimization.'),
        empty(),
        h3('D-Unit Types'),
        ul(
          [b('Attack D-Unit'), { text: ' — Increases AT (Attack Power)' }],
          [b('Defense D-Unit'), { text: ' — Increases DE (Defense)' }],
          [b('HP D-Unit'), { text: ' — Increases HP (Hit Points)' }],
          [b('Critical D-Unit'), { text: ' — Increases CT (Critical Rate)' }],
          [b('Speed D-Unit'), { text: ' — Increases AS (Attack Speed)' }],
        ),
        empty(),
        h3('How to Equip'),
        ul(
          'Open your Digimon\'s equipment panel',
          'Navigate to the D-Unit slots',
          'Place D-Units into the available slots',
          'Each Digimon has a limited number of D-Unit slots',
          'D-Units can be removed and swapped freely',
        ),
        empty(),
        h3('Obtaining D-Units'),
        ul(
          'Drop from dungeon bosses',
          'Crafted via Digital Fusion',
          'Purchased from the Arena Shop',
          'Event rewards',
          'D-Unit Fusion (combining lower-tier D-Units)',
        ),
      ]),
    ],
  },

  'd-unit-hacking': {
    summary: 'D-Unit Hacking process and optimization.',
    tags: ['System', 'Enhancement'],
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
          'You can choose to keep the new stats or revert to the old ones',
        ),
        empty(),
        h3('Hacking Materials'),
        ul(
          'Hacking Program — Required for each hacking attempt',
          'Currency (Bits/Mega) — Fee per attempt',
          'Special Hacking Chips — For guaranteed stat improvements (rare)',
        ),
        empty(),
        h3('Optimization Strategy'),
        ul(
          'Focus on the stats that matter most for your Digimon\'s role',
          'AT% and CT% are generally the most valuable offensive stats',
          'HP% is universally useful for survivability',
          'Save guaranteed hacking chips for high-value D-Units',
          'Keep track of your best roll — don\'t accidentally overwrite it',
        ),
      ]),
      callout('warning', [
        p('Always review the new stats before confirming! Once you accept the new roll, the previous stats are lost permanently.'),
      ]),
    ],
  },

  'd-unit-fusion': {
    summary: 'D-Unit Fusion mechanics and success rates.',
    tags: ['System', 'Enhancement'],
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
          'On failure, the material D-Unit is consumed but the base remains unchanged',
        ),
        empty(),
        h3('Success Rates'),
        ul(
          'Tier 1 → Tier 2: ~70% success rate',
          'Tier 2 → Tier 3: ~50% success rate',
          'Tier 3 → Tier 4: ~30% success rate',
          'Tier 4 → Tier 5: ~15% success rate',
          'Protection items can prevent base D-Unit degradation on failure',
        ),
      ]),
      callout('tip', [
        p('Use low-tier D-Units as fusion material to save costs. The material D-Unit\'s stats don\'t affect the result — only its tier matters for the success rate calculation.'),
      ]),
    ],
  },

  'digimon-breakthrough': {
    summary: 'Breakthrough system for Digimon stat upgrades.',
    tags: ['System', 'Enhancement', 'Breakthrough'],
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
          'Multiple Breakthrough levels are available (BT1, BT2, BT3, etc.)',
        ),
        empty(),
        h3('Requirements'),
        ul(
          'Digimon must be at maximum level for its current stage',
          'Specific Breakthrough materials (vary by Digimon)',
          'Currency fee increases with each level',
          'Some Breakthrough levels require rare materials from dungeons or events',
        ),
        empty(),
        h3('Stat Increases'),
        p('Each Breakthrough level provides scaling stat bonuses:'),
        ul(
          [b('BT1'), { text: ' — Moderate increase to HP and AT' }],
          [b('BT2'), { text: ' — Further increases plus DE bonus' }],
          [b('BT3'), { text: ' — Significant all-stat increase' }],
          [b('BT4+'), { text: ' — Major stat increases, endgame territory' }],
        ),
      ]),
      callout('info', [
        p('Breakthrough is one of the most impactful progression systems. Prioritize your main Digimon\'s Breakthrough over spreading materials across multiple Digimon.'),
      ]),
    ],
  },
};

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Logging into CMS...');
  const loginRes = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const loginData = await loginRes.json();
  if (!loginData.token) {
    console.error('Login failed:', loginData);
    process.exit(1);
  }
  const token = loginData.token;
  console.log('Logged in successfully.\n');

  let updated = 0, failed = 0;

  for (const [slug, data] of Object.entries(SYSTEMS)) {
    // Find the system
    const findRes = await fetch(`${CMS_URL}/api/systems?where[slug][equals]=${slug}&limit=1`);
    const findData = await findRes.json();
    const system = findData.docs?.[0];

    if (!system) {
      console.log(`  ✗ ${slug} — not found in CMS, skipping`);
      failed++;
      continue;
    }

    // Skip if it already has layout content (don't overwrite manual edits)
    if (system.layout && system.layout.length > 0) {
      console.log(`  ○ ${slug} — already has content (${system.layout.length} blocks), skipping`);
      continue;
    }

    // PATCH the system with content
    const patchBody = {
      summary: data.summary,
      tags: data.tags.map(t => ({ tag: t })),
      layout: data.layout,
    };

    const patchRes = await fetch(`${CMS_URL}/api/systems/${system.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `JWT ${token}`,
      },
      body: JSON.stringify(patchBody),
    });

    if (patchRes.ok) {
      console.log(`  ✓ ${slug} — updated with ${data.layout.length} blocks`);
      updated++;
    } else {
      const err = await patchRes.text();
      console.log(`  ✗ ${slug} — PATCH failed: ${patchRes.status} ${err.substring(0, 100)}`);
      failed++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${failed} failed, ${Object.keys(SYSTEMS).length - updated - failed} skipped (already had content)`);
}

main().catch(err => { console.error(err); process.exit(1); });
