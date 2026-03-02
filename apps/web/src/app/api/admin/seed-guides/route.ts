import { NextResponse } from 'next/server';

const CMS_URL = process.env.CMS_INTERNAL_URL || process.env.NEXT_PUBLIC_CMS_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL || '';
const PASS = process.env.CMS_ADMIN_PASSWORD || '';

/* ── Slate helpers ──────────────────────────────────────────────── */
const h2 = (text: string) => ({ type: 'h2', children: [{ text }] });
const p = (text: string) => ({ children: [{ text }] });
const ul = (...items: string[]) => ({
  type: 'ul',
  children: items.map(t => ({ type: 'li', children: [{ children: [{ text: t }] }] })),
});

const XL = '/guides/xros-loader';
const AG = '/guides/adventure-goggles';

async function cmsLogin(): Promise<string> {
  const res = await fetch(`${CMS_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  const data = await res.json();
  if (!data.token) throw new Error('CMS login failed');
  return data.token;
}

async function upsertGuide(token: string, guideData: any) {
  const check = await fetch(
    `${CMS_URL}/api/guides?where[slug][equals]=${guideData.slug}&limit=1`,
    { headers: { Authorization: `JWT ${token}` } },
  );
  const existing = await check.json();

  if (existing.docs?.length > 0) {
    const res = await fetch(`${CMS_URL}/api/guides/${existing.docs[0].id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
      body: JSON.stringify(guideData),
    });
    return (await res.json()).doc;
  }

  const res = await fetch(`${CMS_URL}/api/guides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `JWT ${token}` },
    body: JSON.stringify(guideData),
  });
  return (await res.json()).doc;
}

function buildXrosLoader() {
  return {
    title: 'Xros Loader / Fusion Loader',
    slug: 'xros-loader',
    published: true,
    summary: 'Complete guide to crafting the Xros Loader and Fusion Loader Digivices, including materials, costs, and attribute information.',
    tags: [{ tag: 'Equipment' }, { tag: 'Crafting' }, { tag: 'Digivice' }],
    layout: [
      {
        blockType: 'richText',
        content: [
          p('The Xros Loader and Fusion Loader represent 2 types of Digivice inspired by the Digimon Xros Wars / Digimon Fusion Anime.'),
          p('Each type of Loader adds a unique visual effect to your tamer.'),
          p('The Loaders and their previous stages can be crafted at the Patamon (Craft Item) NPC in the D-Terminal. The craft materials can be dropped from the Susanoomon raid boss in the Destruction and Regeneration Dungeon.'),
          p('The Digicode Item which is needed to craft either one of the Loaders can be obtained from the Quest "God of Destruction and Regeneration" that requires you to kill Susanoomon in the Dungeon 10 times.'),
        ],
      },
      {
        blockType: 'richText',
        content: [
          h2('Digivice Attributes'),
          p('Both versions of the Loader come with 2 options. The options work similarly to the Rings, Necklaces, Earrings, and Bracelets, meaning that they can be changed with Option Change Stone and Number Change Stone, and can be upgraded to 200% with Digitary Power Stone.'),
          p('The 2 Digivice options can be any of the Digimon Attributes and Digimon Elements.'),
          { children: [{ text: 'Important: ', bold: true }, { text: 'Unlike the Basic Attribute option in Rings, Necklaces, Earrings, and Bracelets, the Digivice Attributes are NOT damage bonus from attribute advantage. Instead, they increase the skill damage of Digimon of said Attribute.' }] },
          p('For example, the Light Attribute will increase the skill damage of every Light Digimon that you use, regardless of the enemy type matchup.'),
          ul(
            'Maximum Digimon Attribute bonus: 15%',
            'Maximum Digimon Element bonus: 20%',
            'Stats are higher than OT, D-Ark, TV etc.',
            'You cannot get the same option twice',
            'Both Loaders can equip a total of 6 Chipsets (2 more than OT, D-Ark, TV etc.)',
          ),
        ],
      },
      {
        blockType: 'imageGrid',
        title: 'Aura Preview',
        columns: '2',
        images: [
          { caption: 'Cherry Blossom-Xros Loader', imageUrl: `${XL}/CherryBlossomAura.png` },
          { caption: 'Decidious-Xros Loader', imageUrl: `${XL}/DecidiousAura.png` },
        ],
      },
      {
        blockType: 'imageGrid',
        title: 'Item Preview',
        columns: '2',
        images: [
          { caption: 'Cherry Blossom-Xros Loader', imageUrl: `${XL}/Cherry_Blossom-Xros_Loader.png` },
          { caption: 'Decidious-Xros Loader', imageUrl: `${XL}/Decidious-Xros_Loader.png` },
        ],
      },
      {
        blockType: 'table',
        title: 'Crafting Xros Loader / Fusion Loader',
        headers: [{ label: 'Production Item' }, { label: 'Materials' }, { label: 'Cost' }, { label: 'Success Rate' }],
        rows: [
          { cells: [{ value: 'Digimon Xros Loader Lv 0' }, { value: 'Digicode x1' }, { value: '-' }, { value: '100%' }] },
          ...([
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
          ] as [string, string, number, string][]).map(([to, from, pieces, cost]) => ({
            cells: [
              { value: `Digimon Xros Loader ${to}` },
              { value: `Digimon Xros Loader ${from}\nDigicode Piece x${pieces}` },
              { value: cost },
              { value: '100%' },
            ],
          })),
          { cells: [
            { value: 'Cherry Blossom / Decidious-Xros Loader' },
            { value: 'Digimon Xros Loader Lv 10\nDigicode Piece x98' },
            { value: '227,386,336' },
            { value: '100%' },
          ] },
        ],
      },
      {
        blockType: 'table',
        title: 'Total Amount of Items Needed',
        headers: [{ label: 'Item' }, { label: 'Amount' }],
        rows: [
          { cells: [{ value: 'Digicode Piece' }, { value: '363' }] },
          { cells: [{ value: 'Money' }, { value: '898,928,970' }] },
        ],
      },
    ],
  };
}

function buildAdventureGoggles() {
  function goggleRows(statName: string, data: (string | number | null)[][]) {
    return data.map(([level, skillDmg, stat1, stat2, totalSkill, totalStat]) => ({
      cells: [
        { value: String(level) },
        { value: skillDmg ? `Skill Damage ${skillDmg}%\n${statName} ${stat1} Increase` : `${statName} ${stat1} Increase\n${statName} ${stat2} Increase` },
        { value: totalSkill ? `Skill Damage ${totalSkill}%\n${statName} ${totalStat} Increase` : `${statName} ${totalStat} Increase` },
      ],
    }));
  }

  const htData = [
    ['Adventure Goggles Box', null, 25, 10, null, 35],
    ['Lv1', 1, 50, 25, 1, 75], ['Lv2', 2, 75, 50, 2, 125], ['Lv3', 3, 100, 100, 3, 200],
    ['Lv4', 3, 125, 125, 3, 250], ['Lv5', 3, 150, 150, 3, 300], ['Lv6', 4, 200, 175, 1, 375],
    ['Lv7', 4, 250, 200, 4, 450], ['Lv8', 4, 300, 225, 4, 525], ['Lv9', 5, 350, 250, 5, 600],
    ['Lv10', 5, 400, 275, 5, 675], ['Lv11', 5, 450, 300, 5, 750], ['Lv12', 6, 500, 340, 6, 840],
    ['Lv13', 6, 550, 360, 6, 910], ['Lv14', 6, 600, 380, 6, 980], ['Lv15', 7, 650, 400, 7, 1050],
  ];
  const atData = [
    ['Adventure Goggles Box', null, 300, 275, null, 575],
    ['Lv1', 1, 360, 300, 1, 660], ['Lv2', 2, 390, 325, 2, 715], ['Lv3', 3, 420, 350, 3, 770],
    ['Lv4', 3, 450, 375, 3, 825], ['Lv5', 3, 480, 400, 3, 880], ['Lv6', 4, 510, 425, 4, 935],
    ['Lv7', 4, 540, 450, 4, 990], ['Lv8', 4, 570, 475, 4, 1045], ['Lv9', 5, 600, 500, 5, 1100],
    ['Lv10', 5, 630, 525, 5, 1155], ['Lv11', 5, 660, 550, 5, 1210], ['Lv12', 6, 720, 600, 6, 1320],
    ['Lv13', 6, 780, 650, 6, 1430], ['Lv14', 6, 870, 725, 6, 1595], ['Lv15', 7, 960, 800, 7, 1760],
  ];
  const ctData = [
    ['Adventure Goggles Box', null, 450, 275, null, 725],
    ['Lv1', 1, 500, 300, 1, 800], ['Lv2', 2, 550, 325, 2, 875], ['Lv3', 3, 600, 350, 3, 950],
    ['Lv4', 3, 650, 375, 3, 1025], ['Lv5', 3, 700, 400, 3, 1100], ['Lv6', 4, 750, 425, 4, 1175],
    ['Lv7', 4, 800, 450, 4, 1250], ['Lv8', 4, 850, 475, 4, 1325], ['Lv9', 5, 900, 500, 5, 1400],
    ['Lv10', 5, 950, 550, 5, 1500], ['Lv11', 5, 1000, 600, 5, 1600], ['Lv12', 6, 1050, 650, 6, 1700],
    ['Lv13', 6, 1100, 700, 6, 1800], ['Lv14', 6, 1150, 750, 6, 1900], ['Lv15', 7, 1200, 800, 7, 2000],
  ];

  const craftRows = [
    ['Adventure Goggles', 30, '10,000,000'], ['Adventure Goggles Box', 3, '6,000,000'],
    ['Lv1', 3, '6,600,000'], ['Lv2', 3, '7,260,000'], ['Lv3', 3, '7,990,000'],
    ['Lv4', 3, '8,780,000'], ['Lv5', 5, '10,540,000'], ['Lv6', 5, '12,650,000'],
    ['Lv7', 5, '15,180,000'], ['Lv8', 9, '18,220,000'], ['Lv9', 9, '21,860,000'],
    ['Lv10', 9, '28,420,000'], ['Lv11', 9, '36,940,000'], ['Lv12', 10, '48,020,000'],
    ['Lv13', 10, '62,430,000'], ['Lv14', 10, '81,160,000'], ['Lv15', 20, '121,740,000'],
  ] as [string, number, string][];

  return {
    title: 'Adventure Goggles',
    slug: 'adventure-goggles',
    published: true,
    summary: 'Complete guide to Adventure Goggles — crafting, leveling, rerolling, and stat tables for HT, AT, and CT builds.',
    tags: [{ tag: 'Equipment' }, { tag: 'Crafting' }, { tag: 'Royal Base' }],
    layout: [
      {
        blockType: 'richText',
        content: [
          p('Adventure Goggles are a new accessory introduced with the release of the Royal Base Hard. These special goggles occupy an exclusive equipment slot and offer a range of benefits to the player. When equipped, the Adventure Goggles provide skill damage and specific random stats to further strengthen your Digimon.'),
          p('To obtain the Adventure Goggles, players must craft them using materials obtained through drops from Royal Base (Hard). Once crafted, the goggles can be leveled up to improve their effectiveness and unlock additional bonuses.'),
        ],
      },
      {
        blockType: 'callout',
        type: 'info',
        content: [p('The crafting NPC is Dorumon (Goggles Make) who is located near V-mon and Digitamamon.')],
      },
      {
        blockType: 'callout',
        type: 'warning',
        content: [p('There is a chance to fail when leveling up. You may lose your money, but the goggles stay at the same level. You can reroll until you get the stats you are looking for.')],
      },
      {
        blockType: 'imageGrid',
        title: 'Goggle Variants',
        columns: '4',
        images: [
          { caption: 'Variant 1', imageUrl: `${AG}/Adventure_goggles1.png` },
          { caption: 'Variant 2', imageUrl: `${AG}/Adventure_goggles2.png` },
          { caption: 'Variant 3', imageUrl: `${AG}/Adventure_goggles3.png` },
          { caption: 'Variant 4', imageUrl: `${AG}/Adventure_goggles4.png` },
        ],
      },
      {
        blockType: 'imageGrid',
        title: 'Equipment Slot & Rerolling',
        columns: '2',
        images: [
          { caption: "Goggle's Tamer Slot", imageUrl: `${AG}/Tamer_goggles_slot.png` },
          { caption: 'Rerolling Goggles', imageUrl: `${AG}/Tamer_goggles_reroll.png` },
        ],
      },
      {
        blockType: 'table',
        title: 'Item Craft',
        headers: [{ label: 'Production Item' }, { label: 'Materials' }, { label: 'Cost' }],
        rows: craftRows.map(([name, cores, cost]) => ({
          cells: [
            { value: String(name) },
            { value: `Contaminated X-Antibody - CORE x${cores}` },
            { value: cost },
          ],
        })),
      },
      {
        blockType: 'richText',
        content: [
          h2('Rerolling'),
          p('By using the Material Convert table, you can exchange your level 0 goggles for 27 Contaminated X-Antibody - CORE. This allows you to craft a new Adventure Goggles Box using 30 Contaminated X-Antibody - CORE.'),
          p('Rerolling is a useful strategy if you want to try for better stats on your goggles.'),
        ],
      },
      {
        blockType: 'richText',
        content: [
          h2('Goggles Status'),
          { children: [{ text: 'Note: ', bold: true }, { text: 'Only the stats considered worth keeping and upgrading are listed below.' }] },
        ],
      },
      {
        blockType: 'table',
        title: 'HT/HT Goggles (Hit Rate)',
        headers: [{ label: 'Item' }, { label: 'Status Given' }, { label: 'Total Status' }],
        rows: goggleRows('Hit Rate', htData),
      },
      {
        blockType: 'table',
        title: 'AT/AT Goggles (Attack)',
        headers: [{ label: 'Item' }, { label: 'Status Given' }, { label: 'Total Status' }],
        rows: goggleRows('Attack', atData),
      },
      {
        blockType: 'table',
        title: 'CT/CT Goggles (Critical Hit)',
        headers: [{ label: 'Item' }, { label: 'Status Given' }, { label: 'Total Status' }],
        rows: goggleRows('Critical Hit', ctData),
      },
    ],
  };
}

export async function GET() {
  try {
    const token = await cmsLogin();

    const xros = await upsertGuide(token, buildXrosLoader());
    const goggles = await upsertGuide(token, buildAdventureGoggles());

    return NextResponse.json({
      success: true,
      guides: [
        { title: xros?.title, slug: xros?.slug, id: xros?.id },
        { title: goggles?.title, slug: goggles?.slug, id: goggles?.id },
      ],
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
