// Run with: mongosh mongodb://localhost:27017/dmo-kb seed-guide-blocks.js
const now = new Date();

// Helper: create a Slate richText paragraph
function p(texts) {
  return { children: texts.map(t => typeof t === 'string' ? { text: t } : t) };
}
function bold(text) { return { text: text, bold: true }; }
function h2(text) { return { type: 'h2', children: [{ text }] }; }
function h3(text) { return { type: 'h3', children: [{ text }] }; }
function ul(items) { return { type: 'ul', children: items.map(i => ({ type: 'li', children: [{ children: typeof i === 'string' ? [{ text: i }] : i }] })) }; }

// Build layout blocks
const layout = [
  // Block 1: Introduction richText
  {
    blockType: 'richText',
    content: [
      p([bold('True Digivice'), { text: ' refers to the 11 types of Digivice corresponding to each crest from Digimon Adventure. Each type adds a unique visual aura effect to your tamer.' }]),
    ],
  },

  // Block 2: Quick Info callout
  {
    blockType: 'callout',
    type: 'info',
    content: [
      ul([
        [{ text: 'Crafted via the ' }, bold('Nanomon (Item Craft)'), { text: ' NPC at ' }, bold('Dats Center'), { text: '.' }],
        [{ text: 'Materials drop from raid bosses in ' }, bold('Tokyo-Odaiba'), { text: ' maps.' }],
        [{ text: 'Base version ' }, bold('Digivice of Beginning Lv. 0'), { text: ' is obtained from a main quest at ' }, bold('Minato City'), { text: '.' }],
        [{ text: 'You can craft an additional True Digivice using the ' }, bold('103-OT Digivice'), { text: '.' }],
      ]),
    ],
  },

  // Block 3: Digivice Attributes section
  {
    blockType: 'richText',
    content: [
      h2('Digivice Attributes'),
      p([{ text: 'All versions of True Digivice come with ' }, bold('2 options'), { text: '. They work similarly to Rings, Necklaces, Earrings, and Bracelets \u2014 options can be changed with ' }, bold('Option Change Stone'), { text: ' and ' }, bold('Number Change Stone'), { text: ', upgraded to 200% with ' }, bold('Digitary Power Stone'), { text: ', and renewed with ' }, bold('Renewal Increase Stone'), { text: '.' }]),
      p([{ text: 'Options can be any combination of ' }, bold('Digimon Attributes'), { text: ' and ' }, bold('Digimon Elements'), { text: '. You cannot get the same option twice.' }]),
    ],
  },

  // Block 4: Attribute note callout
  {
    blockType: 'callout',
    type: 'warning',
    content: [
      p([{ text: 'Unlike the Basic Attribute option in accessories, Digivice Attributes are ' }, bold('NOT'), { text: ' damage bonuses from attribute advantage. Instead, they ' }, bold('increase the skill damage'), { text: ' of all Digimon of that attribute, regardless of enemy matchup.' }]),
      p([{ text: 'Max Digimon Attribute: ' }, bold('10%'), { text: '  |  Max Digimon Element: ' }, bold('15%')]),
      p([bold('Digivice of Adventure Lv. 2'), { text: ' and all versions of ' }, bold('103-OT Digivice'), { text: ' have the same stats as True Digivice, minus the tamer visual aura effect.' }]),
    ],
  },

  // Block 5: Aura Types image grid
  {
    blockType: 'imageGrid',
    title: 'Aura Types',
    columns: '4',
    images: [
      { caption: 'Courage', imageUrl: '/images/guides/true-digivice/300px-Courage_True_Vice_aura.png' },
      { caption: 'Friendship', imageUrl: '/images/guides/true-digivice/300px-Friendship_truevice_aura.png' },
      { caption: 'Love', imageUrl: '/images/guides/true-digivice/300px-Love_truevice_aura.png' },
      { caption: 'Purity', imageUrl: '/images/guides/true-digivice/300px-Purity_true_vice_aura.png' },
      { caption: 'Knowledge', imageUrl: '/images/guides/true-digivice/300px-Knowledge_truevice_aura.png' },
      { caption: 'Sincerity', imageUrl: '/images/guides/true-digivice/300px-Sincerity_truevice_aura.png' },
      { caption: 'Kindness', imageUrl: '/images/guides/true-digivice/300px-Kindness_truevice_aura.png' },
      { caption: 'Hope', imageUrl: '/images/guides/true-digivice/Hope_truevice_aura.png' },
      { caption: 'Light', imageUrl: '/images/guides/true-digivice/300px-Light_truevice_aura.png' },
      { caption: 'Fate', imageUrl: '/images/guides/true-digivice/300px-Fate_truevice_aura.png' },
      { caption: 'Miracle', imageUrl: '/images/guides/true-digivice/296px-Miracle_truevice_aura.png' },
    ],
  },

  // Block 6: Crafting steps
  {
    blockType: 'richText',
    content: [
      h2('Crafting True Digivice'),
      p([{ text: 'Complete the quest ' }, bold("[Wizardmon's Plan 1]"), { text: ' via NPC Wizardmon in Minato City to obtain the ' }, bold('Digivice of Beginning Lv. 0'), { text: '.' }]),
    ],
  },

  // Block 7: Crafting table
  {
    blockType: 'table',
    title: '',
    headers: [{ label: 'Production Item' }, { label: 'Materials' }, { label: 'Cost' }, { label: 'Rate' }],
    rows: [
      { cells: [{ value: 'Digivice of Beginning Lv. 1' }, { value: 'Digivice of Beginning Lv. 0, Essence of Evolution x149, Fragment of Evolution x8' }, { value: '200M' }, { value: '100%' }] },
      { cells: [{ value: 'Digivice of Beginning Lv. 2' }, { value: "Digivice of Beginning Lv. 1, Essence of Evolution x211, Piece of Evolution x11, Myotismon's Digicore x6" }, { value: '600M' }, { value: '100%' }] },
      { cells: [{ value: 'Digivice of Adventure Lv. 0' }, { value: "Digivice of Beginning Lv. 2, Essence of Evolution x287, Infective Virus x8, Digimon's Bionic Energy x7, Digital Energy x7" }, { value: '1,500M' }, { value: '100%' }] },
      { cells: [{ value: 'Digivice of Adventure Lv. 1' }, { value: "Digivice of Adventure Lv. 0, Essence of Evolution x301, SkullMeramon's Digicore x7, Absolute Essence of Evolution x5" }, { value: '2,700M' }, { value: '100%' }] },
      { cells: [{ value: 'Digivice of Adventure Lv. 2' }, { value: "Digivice of Adventure Lv. 1, Essence of Evolution x307, Soul of Myotismon x6, Heinous Digicore x3" }, { value: '4,500M' }, { value: '100%' }] },
      { cells: [{ value: 'True Digivice' }, { value: "Digivice of Adventure Lv. 2, Essence of Evolution x318, VenomMyotismon's Venom x7, Condensed Dark Energy x4" }, { value: '8T' }, { value: '100%' }] },
    ],
  },

  // Block 8: Material Recipes heading
  {
    blockType: 'richText',
    content: [h2('Digivice Material Recipes')],
  },

  // Block 9: Material recipes table
  {
    blockType: 'table',
    title: '',
    headers: [{ label: 'Production Item' }, { label: 'Materials' }, { label: 'Cost' }, { label: 'Rate' }],
    rows: [
      { cells: [{ value: 'Absolute Essence of Evolution' }, { value: 'Fragment of Evolution x3, Piece of Evolution x3' }, { value: '100M' }, { value: '100%' }] },
      { cells: [{ value: 'Heinous Digicore' }, { value: "SkullMeramon's Digicore x1, Myotismon's Digicore x3, Infective Virus x3" }, { value: '300M' }, { value: '100%' }] },
      { cells: [{ value: 'Condensed Dark Energy' }, { value: "Myotismon's Digicore x1, SkullMeramon's Digicore x2, Soul of Myotismon x1" }, { value: '700M' }, { value: '100%' }] },
    ],
  },

  // Block 10: Material Locations heading
  {
    blockType: 'richText',
    content: [h2('Material Locations')],
  },

  // Block 11: Material locations table
  {
    blockType: 'table',
    title: '',
    headers: [{ label: 'Material' }, { label: 'Raid Boss' }, { label: 'Location' }],
    rows: [
      { cells: [{ value: 'Fragment of Evolution' }, { value: 'Aquilamon, Mammothmon' }, { value: 'Valley of Light' }] },
      { cells: [{ value: 'Piece of Evolution' }, { value: 'Raremon, Phantomon' }, { value: 'Shibuya' }] },
      { cells: [{ value: "Myotismon's Digicore" }, { value: 'Myotismon' }, { value: 'Shibuya / Minato City' }] },
      { cells: [{ value: 'Digital Energy' }, { value: 'Groundramon' }, { value: 'Odaiba' }] },
      { cells: [{ value: "Digimon's Bionic Energy" }, { value: 'Okuwamon' }, { value: 'Odaiba' }] },
      { cells: [{ value: 'Infective Virus' }, { value: 'Myotismon, DarkTyrannomon' }, { value: 'Big Sight' }] },
      { cells: [{ value: "SkullMeramon's Digicore" }, { value: 'SkullMeramon' }, { value: 'Tokyo Tower Observatory (DG)' }] },
      { cells: [{ value: 'Soul of Myotismon' }, { value: 'Myotismon' }, { value: 'Fuji TV Rooftop (DG)' }] },
      { cells: [{ value: "VenomMyotismon's Venom" }, { value: 'VenomMyotismon' }, { value: 'Venomous Vortex (DG)' }] },
      { cells: [{ value: 'Absolute Essence of Evolution' }, { value: 'MegaSeadramon' }, { value: 'Rainbow Bridge (DG)' }] },
    ],
  },

  // Block 12: Total items callout
  {
    blockType: 'callout',
    type: 'info',
    content: [
      p([{ text: 'The required items for crafting ' }, bold('Absolute Essence of Evolution'), { text: ', ' }, bold('Heinous Digicore'), { text: ', and ' }, bold('Condensed Dark Energy'), { text: ' are already included in the totals below.' }]),
    ],
  },

  // Block 13: Total items table
  {
    blockType: 'table',
    title: 'Total Items / Money Required',
    headers: [{ label: 'Item' }, { label: 'Amount' }],
    rows: [
      { cells: [{ value: 'Essence of Evolution' }, { value: '1,573' }] },
      { cells: [{ value: 'Fragment of Evolution' }, { value: '23' }] },
      { cells: [{ value: 'Piece of Evolution' }, { value: '26' }] },
      { cells: [{ value: "Myotismon's Digicore" }, { value: '19' }] },
      { cells: [{ value: 'Infective Virus' }, { value: '17' }] },
      { cells: [{ value: "Digimon's Bionic Energy" }, { value: '7' }] },
      { cells: [{ value: 'Digital Energy' }, { value: '7' }] },
      { cells: [{ value: "SkullMeramon's Digicore" }, { value: '18' }] },
      { cells: [{ value: 'Soul of Myotismon' }, { value: '10' }] },
      { cells: [{ value: "VenomMyotismon's Venom" }, { value: '7' }] },
      { cells: [{ value: 'Absolute Essence of Evolution' }, { value: '5' }] },
      { cells: [{ value: 'Heinous Digicore' }, { value: '3' }] },
      { cells: [{ value: 'Condensed Dark Energy' }, { value: '4' }] },
      { cells: [{ value: 'Money' }, { value: '21T 700M' }] },
    ],
  },

  // Block 14: Resetting section
  {
    blockType: 'richText',
    content: [
      h2('Resetting True Digivice'),
      p([{ text: 'Since the version of True Digivice you receive is ' }, bold('random'), { text: ', the game allows you to re-craft from any version you have obtained. OT Digivices can also be changed into True Digivice using this method. All reset recipes have a ' }, bold('100% success rate'), { text: '.' }]),
    ],
  },

  // Block 15: Reset recipes table
  {
    blockType: 'table',
    title: '',
    headers: [{ label: 'Source' }, { label: 'Materials' }, { label: 'Cost' }],
    rows: [
      ...[
        'Courage', 'Friendship', 'Love', 'Purity', 'Knowledge',
        'Sincerity', 'Kindness', 'Hope', 'Light', 'Fate', 'Miracle',
      ].map(type => ({
        cells: [
          { value: 'Digivice of ' + type },
          { value: "VenomMyotismon's Venom x1, Soul of Myotismon x2, SkullMeramon's Digicore x4, Essence of Evolution x710" },
          { value: '4T' },
        ],
      })),
      { cells: [{ value: '103-Orange-OT' }, { value: "Essence of Evolution x318, VenomMyotismon's Venom x7, Condensed Dark Energy x4" }, { value: '8T' }] },
      { cells: [{ value: '103-Purple-OT' }, { value: "Essence of Evolution x318, VenomMyotismon's Venom x7, Condensed Dark Energy x4" }, { value: '8T' }] },
    ],
  },

  // Block 16: Source
  {
    blockType: 'richText',
    content: [
      p([{ text: 'Source: ' }, { text: 'dmowiki.com/Guide:_True_Digivice', italic: true }]),
    ],
  },
];

// Update the existing guide
const result = db.guides.updateOne(
  { slug: 'true-digivice' },
  {
    $set: {
      layout: layout,
      updatedAt: now,
    },
  }
);

if (result.matchedCount > 0) {
  print('Updated True Digivice guide with ' + layout.length + ' layout blocks.');
} else {
  print('ERROR: Guide not found. Run seed-mongo.js first.');
}
