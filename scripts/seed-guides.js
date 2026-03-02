#!/usr/bin/env node
/**
 * Seed script: Creates Xros Loader and Adventure Goggles guides in Payload CMS.
 * Usage: CMS_URL=http://localhost:3001 node scripts/seed-guides.js
 */
const fs = require('fs');
const path = require('path');

const CMS_URL = process.env.CMS_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL || 'lukas.bohn@icloud.com';
const PASS = process.env.CMS_ADMIN_PASSWORD || 'ilovecf123';

let TOKEN = '';

async function login() {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('Login failed: ' + JSON.stringify(data));
  TOKEN = data.token;
  console.log('Logged in');
}

async function uploadMedia(filePath, altText) {
  const form = new FormData();
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  form.append('file', new Blob([fileBuffer]), fileName);
  form.append('alt', altText || fileName);

  const res = await fetch(`${CMS_URL}/api/media`, {
    method: 'POST',
    headers: { Authorization: `JWT ${TOKEN}` },
    body: form,
  });
  const data = await res.json();
  if (!data.doc?.id) throw new Error('Upload failed for ' + fileName + ': ' + JSON.stringify(data));
  console.log(`  Uploaded: ${fileName} -> ${data.doc.id}`);
  return data.doc.id;
}

async function createGuide(guideData) {
  // Check if guide already exists
  const check = await fetch(`${CMS_URL}/api/guides?where[slug][equals]=${guideData.slug}&limit=1`, {
    headers: { Authorization: `JWT ${TOKEN}` },
  });
  const existing = await check.json();
  if (existing.docs?.length > 0) {
    console.log(`Guide "${guideData.title}" already exists (id: ${existing.docs[0].id}), updating...`);
    const res = await fetch(`${CMS_URL}/api/guides/${existing.docs[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
      body: JSON.stringify(guideData),
    });
    const data = await res.json();
    if (data.doc) console.log(`  Updated: ${data.doc.title}`);
    return data.doc;
  }
  const res = await fetch(`${CMS_URL}/api/guides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${TOKEN}` },
    body: JSON.stringify(guideData),
  });
  const data = await res.json();
  if (!data.doc?.id) throw new Error('Create guide failed: ' + JSON.stringify(data));
  console.log(`  Created: ${data.doc.title} (${data.doc.slug})`);
  return data.doc;
}

// Slate helper
const h2 = (text) => ({ type: 'h2', children: [{ text }] });
const h3 = (text) => ({ type: 'h3', children: [{ text }] });
const p = (text, opts = {}) => ({ children: [{ text, ...opts }] });
const pBold = (text) => ({ children: [{ text, bold: true }] });
const ul = (...items) => ({ type: 'ul', children: items.map(t => ({ type: 'li', children: [{ children: [{ text: t }] }] })) });

// Image base paths
const XL = '/guides/xros-loader';
const AG = '/guides/adventure-goggles';

async function seedXrosLoader(mediaIds) {
  const layout = [
    // Introduction
    {
      blockType: 'richText',
      content: [
        p('The Xros Loader and Fusion Loader represent 2 types of Digivice inspired by the Digimon Xros Wars / Digimon Fusion Anime.'),
        p('Each type of Loader adds a unique visual effect to your tamer.'),
        p('The Loaders and their previous stages can be crafted at the Patamon (Craft Item) NPC in the D-Terminal. The craft materials can be dropped from the Susanoomon raid boss in the Destruction and Regeneration Dungeon.'),
        p('The Digicode Item which is needed to craft either one of the Loaders can be obtained from the Quest "God of Destruction and Regeneration" that requires you to kill Susanoomon in the Dungeon 10 times.'),
      ],
    },
    // Digivice Attributes
    {
      blockType: 'richText',
      content: [
        h2('Digivice Attributes'),
        p('Both versions of the Loader come with 2 options. The options work similarly to the Rings, Necklaces, Earrings, and Bracelets, meaning that they can be changed with Option Change Stone and Number Change Stone, and can be upgraded to 200% with Digitary Power Stone.'),
        p('The 2 Digivice options can be any of the Digimon Attributes and Digimon Elements.'),
        { children: [{ text: 'Important:', bold: true }, { text: ' Unlike the Basic Attribute option in Rings, Necklaces, Earrings, and Bracelets, the Digivice Attributes are NOT damage bonus from attribute advantage. Instead, they increase the skill damage of Digimon of said Attribute.' }] },
        p('For example, the Light Attribute will increase the skill damage of every Light Digimon that you use, regardless of the enemy type matchup.'),
        ul(
          'Maximum Digimon Attribute bonus: 15%',
          'Maximum Digimon Element bonus: 20%',
          'Stats are higher than OT, D-Ark, TV etc.',
          'You cannot get the same option twice',
          'Both Loaders can equip a total of 6 Chipsets (2 more than OT, D-Ark, TV etc.)'
        ),
      ],
    },
    // Aura Preview
    {
      blockType: 'imageGrid',
      title: 'Aura Preview',
      columns: '2',
      images: [
        { caption: 'Cherry Blossom-Xros Loader', imageUrl: `${XL}/CherryBlossomAura.png` },
        { caption: 'Decidious-Xros Loader', imageUrl: `${XL}/DecidiousAura.png` },
      ],
    },
    // Item Preview
    {
      blockType: 'imageGrid',
      title: 'Item Preview',
      columns: '2',
      images: [
        { caption: 'Cherry Blossom-Xros Loader', imageUrl: `${XL}/Cherry_Blossom-Xros_Loader.png` },
        { caption: 'Decidious-Xros Loader', imageUrl: `${XL}/Decidious-Xros_Loader.png` },
      ],
    },
    // Crafting Table
    {
      blockType: 'table',
      title: 'Crafting Xros Loader / Fusion Loader',
      headers: [
        { label: 'Production Item' },
        { label: 'Materials' },
        { label: 'Cost' },
        { label: 'Success Rate' },
      ],
      rows: [
        { cells: [
          { value: 'Digimon Xros Loader Lv 0', icon: mediaIds.xrosLoader || null },
          { lines: [{ text: 'Digicode x1', icon: mediaIds.digicode || null }] },
          { value: '-' },
          { value: '100%' },
        ]},
        ...[
          ['Lv 1', 'Lv 0', 12, '30,000,000'],
          ['Lv 2', 'Lv 1', 13, '33,000,000'],
          ['Lv 3', 'Lv 2', 15, '36,300,000'],
          ['Lv 4', 'Lv 3', 16, '39,930,000'],
          ['Lv 5', 'Lv 4', 22, '47,916,200'],
          ['Lv 6', 'Lv 5', 25, '57,499,200'],
          ['Lv 7', 'Lv 6', 27, '68,999,040'],
          ['Lv 8', 'Lv 7', 41, '89,698,752'],
          ['Lv 9', 'Lv 8', 45, '116,608,752'],
          ['Lv 10', 'Lv 9', 49, '115,590,890'],
        ].map(([to, from, pieces, cost]) => ({
          cells: [
            { value: `Digimon Xros Loader ${to}`, icon: mediaIds.xrosLoader || null },
            { lines: [
              { text: `Digimon Xros Loader ${from}`, icon: mediaIds.xrosLoader || null },
              { text: `Digicode Piece x${pieces}`, icon: mediaIds.digicodePiece || null },
            ]},
            { value: cost },
            { value: '100%' },
          ],
        })),
        { cells: [
          { value: 'Cherry Blossom-Xros Loader or Decidious-Xros Loader', icon: mediaIds.cherryBlossom || null },
          { lines: [
            { text: 'Digimon Xros Loader Lv 10', icon: mediaIds.xrosLoader || null },
            { text: 'Digicode Piece x98', icon: mediaIds.digicodePiece || null },
          ]},
          { value: '227,386,336' },
          { value: '100%' },
        ]},
      ],
    },
    // Total items needed
    {
      blockType: 'table',
      title: 'Total Amount of Items Needed',
      headers: [
        { label: 'Item' },
        { label: 'Amount' },
      ],
      rows: [
        { cells: [
          { value: 'Digicode Piece', icon: mediaIds.digicodePiece || null },
          { value: '363' },
        ]},
        { cells: [
          { value: 'Money', icon: mediaIds.coin || null },
          { value: '898,928,970' },
        ]},
      ],
    },
  ];

  return createGuide({
    title: 'Xros Loader / Fusion Loader',
    slug: 'xros-loader',
    published: true,
    summary: 'Complete guide to crafting the Xros Loader and Fusion Loader Digivices, including materials, costs, and attribute information.',
    tags: [{ tag: 'Equipment' }, { tag: 'Crafting' }, { tag: 'Digivice' }],
    layout,
  });
}

async function seedAdventureGoggles(mediaIds) {
  // Helper for goggles stat rows
  function goggleRows(statName, data) {
    return data.map(([level, skillDmg, stat1, stat2, totalSkill, totalStat]) => ({
      cells: [
        { value: level, icon: level === 'Adventure Goggles Box' ? mediaIds.gogglesBox : mediaIds.goggles1 },
        { value: skillDmg ? `Skill Damage ${skillDmg}%\n${statName} ${stat1} Increase` : `${statName} ${stat1} Increase` },
        { value: skillDmg ? `${statName} ${stat2} Increase` : `${statName} ${stat2} Increase` },
        { value: totalSkill ? `Skill Damage ${totalSkill}%\n${statName} ${totalStat} Increase` : `${statName} ${totalStat} Increase` },
      ],
    }));
  }

  const htData = [
    ['Adventure Goggles Box', null, '25', '10', null, '35'],
    ['Adventure Goggles Lv1', 1, '50', '25', 1, '75'],
    ['Adventure Goggles Lv2', 2, '75', '50', 2, '125'],
    ['Adventure Goggles Lv3', 3, '100', '100', 3, '200'],
    ['Adventure Goggles Lv4', 3, '125', '125', 3, '250'],
    ['Adventure Goggles Lv5', 3, '150', '150', 3, '300'],
    ['Adventure Goggles Lv6', 4, '200', '175', 1, '375'],
    ['Adventure Goggles Lv7', 4, '250', '200', 4, '450'],
    ['Adventure Goggles Lv8', 4, '300', '225', 4, '525'],
    ['Adventure Goggles Lv9', 5, '350', '250', 5, '600'],
    ['Adventure Goggles Lv10', 5, '400', '275', 5, '675'],
    ['Adventure Goggles Lv11', 5, '450', '300', 5, '750'],
    ['Adventure Goggles Lv12', 6, '500', '340', 6, '840'],
    ['Adventure Goggles Lv13', 6, '550', '360', 6, '910'],
    ['Adventure Goggles Lv14', 6, '600', '380', 6, '980'],
    ['Adventure Goggles Lv15', 7, '650', '400', 7, '1050'],
  ];

  const atData = [
    ['Adventure Goggles Box', null, '300', '275', null, '575'],
    ['Adventure Goggles Lv1', 1, '360', '300', 1, '660'],
    ['Adventure Goggles Lv2', 2, '390', '325', 2, '715'],
    ['Adventure Goggles Lv3', 3, '420', '350', 3, '770'],
    ['Adventure Goggles Lv4', 3, '450', '375', 3, '825'],
    ['Adventure Goggles Lv5', 3, '480', '400', 3, '880'],
    ['Adventure Goggles Lv6', 4, '510', '425', 4, '935'],
    ['Adventure Goggles Lv7', 4, '540', '450', 4, '990'],
    ['Adventure Goggles Lv8', 4, '570', '475', 4, '1045'],
    ['Adventure Goggles Lv9', 5, '600', '500', 5, '1100'],
    ['Adventure Goggles Lv10', 5, '630', '525', 5, '1155'],
    ['Adventure Goggles Lv11', 5, '660', '550', 5, '1210'],
    ['Adventure Goggles Lv12', 6, '720', '600', 6, '1320'],
    ['Adventure Goggles Lv13', 6, '780', '650', 6, '1430'],
    ['Adventure Goggles Lv14', 6, '870', '725', 6, '1595'],
    ['Adventure Goggles Lv15', 7, '960', '800', 7, '1760'],
  ];

  const ctData = [
    ['Adventure Goggles Box', null, '450', '275', null, '725'],
    ['Adventure Goggles Lv1', 1, '500', '300', 1, '800'],
    ['Adventure Goggles Lv2', 2, '550', '325', 2, '875'],
    ['Adventure Goggles Lv3', 3, '600', '350', 3, '950'],
    ['Adventure Goggles Lv4', 3, '650', '375', 3, '1025'],
    ['Adventure Goggles Lv5', 3, '700', '400', 3, '1100'],
    ['Adventure Goggles Lv6', 4, '750', '425', 4, '1175'],
    ['Adventure Goggles Lv7', 4, '800', '450', 4, '1250'],
    ['Adventure Goggles Lv8', 4, '850', '475', 4, '1325'],
    ['Adventure Goggles Lv9', 5, '900', '500', 5, '1400'],
    ['Adventure Goggles Lv10', 5, '950', '550', 5, '1500'],
    ['Adventure Goggles Lv11', 5, '1000', '600', 5, '1600'],
    ['Adventure Goggles Lv12', 6, '1050', '650', 6, '1700'],
    ['Adventure Goggles Lv13', 6, '1100', '700', 6, '1800'],
    ['Adventure Goggles Lv14', 6, '1150', '750', 6, '1900'],
    ['Adventure Goggles Lv15', 7, '1200', '800', 7, '2000'],
  ];

  const craftData = [
    ['Adventure Goggles', 30, '10,000,000'],
    ['Adventure Goggles Box', 3, '6,000,000'],
    ['Adventure Goggles Lv1', 3, '6,600,000'],
    ['Adventure Goggles Lv2', 3, '7,260,000'],
    ['Adventure Goggles Lv3', 3, '7,990,000'],
    ['Adventure Goggles Lv4', 3, '8,780,000'],
    ['Adventure Goggles Lv5', 5, '10,540,000'],
    ['Adventure Goggles Lv6', 5, '12,650,000'],
    ['Adventure Goggles Lv7', 5, '15,180,000'],
    ['Adventure Goggles Lv8', 9, '18,220,000'],
    ['Adventure Goggles Lv9', 9, '21,860,000'],
    ['Adventure Goggles Lv10', 9, '28,420,000'],
    ['Adventure Goggles Lv11', 9, '36,940,000'],
    ['Adventure Goggles Lv12', 10, '48,020,000'],
    ['Adventure Goggles Lv13', 10, '62,430,000'],
    ['Adventure Goggles Lv14', 10, '81,160,000'],
    ['Adventure Goggles Lv15', 20, '121,740,000'],
  ];

  const layout = [
    // Introduction
    {
      blockType: 'richText',
      content: [
        p('Adventure Goggles are a new accessory introduced with the release of the Royal Base Hard. These special goggles occupy an exclusive equipment slot and offer a range of benefits to the player. When equipped, the Adventure Goggles provide skill damage and specific random stats to further strengthen your Digimon.'),
        p('To obtain the Adventure Goggles, players must craft them using materials obtained through drops from Royal Base (Hard). Once crafted, the goggles can be leveled up to improve their effectiveness and unlock additional bonuses. Upgrading the goggles requires resources and time, but the investment is worth it for the significant advantages they bring to your Digimon in combat.'),
      ],
    },
    // Callouts
    {
      blockType: 'callout',
      type: 'info',
      content: [
        p('The crafting NPC is Dorumon (Goggles Make) who is located near V-mon and Digitamamon.'),
      ],
    },
    {
      blockType: 'callout',
      type: 'warning',
      content: [
        p('There is a chance to fail when leveling up. You may lose your money, but the goggles stay at the same level. You can reroll until you get the stats you are looking for.'),
      ],
    },
    // Goggles images
    {
      blockType: 'imageGrid',
      title: 'Goggle Variants',
      columns: '4',
      images: [
        { caption: 'Adventure Goggles 1', imageUrl: `${AG}/Adventure_goggles1.png` },
        { caption: 'Adventure Goggles 2', imageUrl: `${AG}/Adventure_goggles2.png` },
        { caption: 'Adventure Goggles 3', imageUrl: `${AG}/Adventure_goggles3.png` },
        { caption: 'Adventure Goggles 4', imageUrl: `${AG}/Adventure_goggles4.png` },
      ],
    },
    // Tamer slot image
    {
      blockType: 'imageGrid',
      title: 'Equipment Slot',
      columns: '2',
      images: [
        { caption: "Goggle's Tamer Slot", imageUrl: `${AG}/Tamer_goggles_slot.png` },
        { caption: 'Rerolling Goggles', imageUrl: `${AG}/Tamer_goggles_reroll.png` },
      ],
    },
    // Crafting Table
    {
      blockType: 'table',
      title: 'Item Craft',
      headers: [
        { label: 'Production Item' },
        { label: 'Materials' },
        { label: 'Cost' },
      ],
      rows: craftData.map(([name, cores, cost]) => ({
        cells: [
          { value: name, icon: mediaIds.gogglesBox || null },
          { lines: [{ text: `Contaminated X-Antibody - CORE x${cores}`, icon: mediaIds.xCore || null }] },
          { value: cost },
        ],
      })),
    },
    // Rerolling
    {
      blockType: 'richText',
      content: [
        h2('Rerolling'),
        p('By using the Material Convert table, you can exchange your level 0 goggles for 27 Contaminated X-Antibody - CORE. This allows you to craft a new Adventure Goggles Box using 30 Contaminated X-Antibody - CORE.'),
        p('Rerolling is a useful strategy if you want to try for better stats on your goggles.'),
      ],
    },
    // Goggles Status heading
    {
      blockType: 'richText',
      content: [
        h2('Goggles Status'),
        { children: [{ text: 'Note:', bold: true }, { text: ' Only the stats considered worth keeping and upgrading are listed below.' }] },
      ],
    },
    // HT/HT Table
    {
      blockType: 'table',
      title: 'HT/HT Goggles (Hit Rate)',
      headers: [
        { label: 'Item' },
        { label: 'Status Given' },
        { label: 'Status Given' },
        { label: 'Total Status Given' },
      ],
      rows: goggleRows('Hit Rate', htData),
    },
    // AT/AT Table
    {
      blockType: 'table',
      title: 'AT/AT Goggles (Attack)',
      headers: [
        { label: 'Item' },
        { label: 'Status Given' },
        { label: 'Status Given' },
        { label: 'Total Status Given' },
      ],
      rows: goggleRows('Attack', atData),
    },
    // CT/CT Table
    {
      blockType: 'table',
      title: 'CT/CT Goggles (Critical Hit)',
      headers: [
        { label: 'Item' },
        { label: 'Status Given' },
        { label: 'Status Given' },
        { label: 'Total Status Given' },
      ],
      rows: goggleRows('Critical Hit', ctData),
    },
  ];

  return createGuide({
    title: 'Adventure Goggles',
    slug: 'adventure-goggles',
    published: true,
    summary: 'Complete guide to Adventure Goggles — crafting, leveling, rerolling, and stat tables for HT, AT, and CT builds.',
    tags: [{ tag: 'Equipment' }, { tag: 'Crafting' }, { tag: 'Royal Base' }],
    layout,
  });
}

async function main() {
  console.log(`Seeding guides to ${CMS_URL}...`);
  await login();

  // Upload key images to CMS media
  const imgBase = path.resolve(__dirname, '../apps/web/public/guides');
  console.log('\nUploading media...');
  const mediaIds = {};
  const uploads = [
    ['xrosLoader', 'xros-loader/XrosLoader.png', 'Xros Loader Icon'],
    ['digicode', 'xros-loader/Digicode.png', 'Digicode'],
    ['digicodePiece', 'xros-loader/Digicode_Piece.png', 'Digicode Piece'],
    ['cherryBlossom', 'xros-loader/Cherry_Blossom-Xros_Loader.png', 'Cherry Blossom-Xros Loader'],
    ['decidious', 'xros-loader/Decidious-Xros_Loader.png', 'Decidious-Xros Loader'],
    ['coin', 'xros-loader/Coin_Currency.png', 'Coin Currency'],
    ['gogglesBox', 'adventure-goggles/Adventure_goggles_box.png', 'Adventure Goggles Box'],
    ['goggles1', 'adventure-goggles/Adventure_goggles1.png', 'Adventure Goggles'],
    ['xCore', 'adventure-goggles/Contaminated_X-Antibody_-_CORE.png', 'Contaminated X-Antibody CORE'],
  ];

  for (const [key, relPath, alt] of uploads) {
    try {
      mediaIds[key] = await uploadMedia(path.join(imgBase, relPath), alt);
    } catch (e) {
      console.warn(`  Warning: Failed to upload ${relPath}: ${e.message}`);
      mediaIds[key] = null;
    }
  }

  console.log('\nCreating Xros Loader guide...');
  await seedXrosLoader(mediaIds);

  console.log('\nCreating Adventure Goggles guide...');
  await seedAdventureGoggles(mediaIds);

  console.log('\nDone! Both guides are now available in the CMS.');
}

main().catch(e => { console.error(e); process.exit(1); });
