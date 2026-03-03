'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp, Swords, Gift, Info, AlertTriangle } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

interface Summon { name: string; hp: string; level: string; icon?: string }
interface Drop { item: string; icon?: string }
interface CardLevel {
  level: string;
  exp: string;
  cardIcon: string;
  summons: Summon[];
  drops: Drop[];
  nextCard?: string;
}

const mc = (name: string) => `/images/mc/${name}`;
const digiIcon = (name: string) => mc(`${name.replace(/[\s()]/g, '_').replace(/_+/g, '_')}_Search_Icon.png`);

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — Regular Cards (Lv1–7)
   ═══════════════════════════════════════════════════════════════════════════ */

const REGULAR: CardLevel[] = [
  {
    level: 'Lv1', exp: '3,307', cardIcon: mc('Monster_Card_Lv1.png'),
    summons: [
      { name: 'Patamon', hp: '9,840', level: '30' },
      { name: 'Renamon', hp: '9,840', level: '30' },
      { name: 'Guilmon', hp: '9,840', level: '30' },
      { name: 'Veemon', hp: '9,840', level: '30' },
      { name: 'Drimogemon', hp: '9,840', level: '30' },
    ],
    drops: [
      { item: '220 Bits', icon: mc('Money.png') },
      { item: 'Evoluter', icon: mc('Evoluter.png') },
      { item: 'Chicken Combo', icon: mc('Chicken_Combo.png') },
      { item: 'Gold Banana', icon: mc('Gold_Banana.png') },
      { item: 'DigiClone [D]', icon: mc('Digiclon_D.png') },
      { item: 'Digimon Seals', icon: mc('Digimon_Seal.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Dragon DigiEgg', icon: mc('Dragon_DigiEgg.png') },
      { item: 'Seal Exchange Ticket', icon: mc('Seal_Exchange_Ticket.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'Mode Selector', icon: mc('ModeSelector.png') },
      { item: 'Mystery Armor Egg Box', icon: mc('Mystery_Armor_Egg_Box_Icon.png') },
      { item: 'Attribute Rank A', icon: mc('Attribute_Legend.png') },
    ],
    nextCard: 'Monster Card Lv2',
  },
  {
    level: 'Lv2', exp: '4,907', cardIcon: mc('Monster_Card_Lv2.png'),
    summons: [
      { name: 'Goblimon', hp: '13,680', level: '40' },
      { name: 'Keramon', hp: '13,680', level: '40' },
      { name: 'Mushroomon', hp: '13,680', level: '40' },
      { name: 'Tentomon', hp: '13,680', level: '40' },
      { name: 'Dracmon', hp: '13,680', level: '40' },
    ],
    drops: [
      { item: '327 Bits', icon: mc('Money.png') },
      { item: 'Evoluter', icon: mc('Evoluter.png') },
      { item: 'Chicken Combo', icon: mc('Chicken_Combo.png') },
      { item: 'DigiClone [D]', icon: mc('Digiclon_D.png') },
      { item: 'Plant DigiEgg', icon: mc('Plant_DigiEgg.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'Attribute Rank A', icon: mc('Attribute_Rare.png') },
    ],
    nextCard: 'Monster Card Lv3',
  },
  {
    level: 'Lv3', exp: '6,475', cardIcon: mc('Monster_Card_Lv3.png'),
    summons: [
      { name: 'Woodmon', hp: '21,720', level: '50' },
      { name: 'Sangloupmon', hp: '21,720', level: '50' },
      { name: 'Waspmon', hp: '21,720', level: '50' },
      { name: 'Flymon', hp: '21,720', level: '50' },
      { name: 'Veedramon', hp: '21,720', level: '50' },
    ],
    drops: [
      { item: '431 Bits', icon: mc('Money.png') },
      { item: 'Evoluter', icon: mc('Evoluter.png') },
      { item: 'DigiClone [D]', icon: mc('Digiclon_D.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'Attribute Rank B', icon: mc('Attribute_Rare.png') },
    ],
    nextCard: 'Monster Card Lv4',
  },
  {
    level: 'Lv4', exp: '8,435', cardIcon: mc('Monster_Card_Lv4.png'),
    summons: [
      { name: 'Centarumon', hp: '34,560', level: '60' },
      { name: 'Kyubimon', hp: '34,560', level: '60' },
      { name: 'Meramon', hp: '34,560', level: '60' },
    ],
    drops: [
      { item: '562 Bits', icon: mc('Money.png') },
      { item: 'Evoluter', icon: mc('Evoluter.png') },
      { item: 'DigiClone [C]', icon: mc('Clone_C.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'Attribute Rank B', icon: mc('Attribute_Rare.png') },
    ],
    nextCard: 'Monster Card Lv5',
  },
  {
    level: 'Lv5', exp: '20,465', cardIcon: mc('Monster_Card_Lv5.png'),
    summons: [
      { name: 'Sinduramon', hp: '60,360', level: '70' },
      { name: 'Knightmon', hp: '60,360', level: '70' },
      { name: 'NeoDevimon', hp: '60,360', level: '70' },
    ],
    drops: [
      { item: '1,364 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [B]', icon: mc('Clone_B.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
      { item: 'Random Riding Box', icon: mc('Random_Riding_Box.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
    ],
    nextCard: 'Monster Card Lv6',
  },
  {
    level: 'Lv6', exp: '22,495', cardIcon: mc('Monster_Card_Lv6.png'),
    summons: [
      { name: 'Marin Devimon', hp: '99,240', level: '80', icon: mc('Marin_Devimon_Search_Icon.png') },
      { name: 'Etemon', hp: '99,240', level: '80' },
      { name: 'Giromon', hp: '99,240', level: '80' },
    ],
    drops: [
      { item: '833 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [B]', icon: mc('Clone_B.png') },
      { item: 'Aquatic DigiEgg', icon: mc('Aquatic_DigiEgg.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
      { item: 'Random Riding Box', icon: mc('Random_Riding_Box.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
    ],
    nextCard: 'Monster Card Lv7',
  },
  {
    level: 'Lv7', exp: '24,525', cardIcon: mc('Monster_Card_Lv7.png'),
    summons: [
      { name: 'Kimeramon', hp: '170,760', level: '90' },
      { name: 'Diablomon', hp: '170,760', level: '90' },
      { name: 'Parasimon', hp: '170,760', level: '90' },
      { name: 'DexDoruGreymon', hp: '170,760', level: '90' },
    ],
    drops: [
      { item: '1,635 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [A]', icon: mc('Clone_A.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
      { item: 'Random Riding Box', icon: mc('Random_Riding_Box.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'Attribute Rank D', icon: mc('Attribute_Normal.png') },
    ],
    nextCard: 'Monster Card Lv7',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — High Rank Cards (Lv1–6)
   ═══════════════════════════════════════════════════════════════════════════ */

const HIGH_RANK: CardLevel[] = [
  {
    level: 'Lv1', exp: '73,520', cardIcon: mc('High_Rank_Monster_Card_Lv1.png'),
    summons: [
      { name: 'Anubismon', hp: '183,800', level: '98–100' },
      { name: 'MetalEtemon', hp: '183,800', level: '98–100' },
      { name: 'Boltmon', hp: '183,800', level: '98–100' },
      { name: 'GrandKuwagamon', hp: '183,800', level: '98–100' },
      { name: 'DinoTigermon', hp: '183,800', level: '98–100' },
    ],
    drops: [
      { item: '4,901 Bits', icon: mc('Money.png') },
      { item: 'Evoluter', icon: mc('Evoluter.png') },
      { item: 'Double Chicken Combo', icon: mc('Double_Chicken_Combo.png') },
      { item: 'Sweet Gold Banana', icon: mc('Sweet_gold_banana_file_Usage.png') },
      { item: 'DigiClone [A]', icon: mc('Clone_A.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
      { item: 'Random Riding Box', icon: mc('Random_Riding_Box.png') },
      { item: 'Attribute Rank C', icon: mc('Attribute_Rank_C.png') },
    ],
    nextCard: 'High Rank MC Lv2',
  },
  {
    level: 'Lv2', exp: '98,360', cardIcon: mc('High_Rank_Monster_Card_Lv2.png'),
    summons: [
      { name: 'HiAndromon', hp: '245,900', level: '108–110' },
      { name: 'Brakedramon', hp: '245,900', level: '108–110' },
      { name: 'Gryphonmon', hp: '245,900', level: '108–110' },
      { name: 'Slayerdramon', hp: '245,900', level: '108–110' },
      { name: 'TigerVespamon', hp: '245,900', level: '108–110' },
    ],
    drops: [
      { item: '6,557 Bits', icon: mc('Money.png') },
      { item: 'Evoluter', icon: mc('Evoluter.png') },
      { item: 'Double Chicken Combo', icon: mc('Double_Chicken_Combo.png') },
      { item: 'DigiClone [A]', icon: mc('Clone_A.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
      { item: 'Random Riding Box', icon: mc('Random_Riding_Box.png') },
    ],
    nextCard: 'High Rank MC Lv3',
  },
  {
    level: 'Lv3', exp: '128,120', cardIcon: mc('High_Rank_Monster_Card_Lv3.png'),
    summons: [
      { name: 'Vikemon', hp: '320,300', level: '118–120' },
      { name: 'Justimon', hp: '320,300', level: '118–120' },
      { name: 'GrandisKuwagamon', hp: '320,300', level: '118–120' },
      { name: 'GranDracmon', hp: '320,300', level: '118–120' },
      { name: 'HerculesKabuterimon', hp: '320,300', level: '118–120' },
    ],
    drops: [
      { item: '8,541 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [S]', icon: mc('Clone_S.png') },
      { item: 'Sweet Gold Banana', icon: mc('Sweet_gold_banana_file_Usage.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
      { item: 'Random Riding Box', icon: mc('Random_Riding_Box.png') },
    ],
    nextCard: 'High Rank MC Lv4',
  },
  {
    level: 'Lv4', exp: '162,800', cardIcon: mc('High_Rank_Monster_Card_Lv4.png'),
    summons: [
      { name: 'Piedmon', hp: '407,000', level: '128–130' },
      { name: 'Mugendramon', hp: '407,000', level: '128–130' },
      { name: 'VenomMyotismon', hp: '407,000', level: '128–130' },
      { name: 'Puppetmon', hp: '407,000', level: '128–130' },
      { name: 'MetalSeadramon', hp: '407,000', level: '128–130' },
    ],
    drops: [
      { item: '10,853 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [S]', icon: mc('Clone_S.png') },
      { item: 'Sweet Gold Banana', icon: mc('Sweet_gold_banana_file_Usage.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
      { item: 'Random Riding Box', icon: mc('Random_Riding_Box.png') },
    ],
    nextCard: 'High Rank MC Lv5',
  },
  {
    level: 'Lv5', exp: '202,400', cardIcon: mc('High_Rank_Monster_Card_Lv5.png'),
    summons: [
      { name: 'DexDorugoramon', hp: '506,000', level: '135–140' },
      { name: 'Seraphimon', hp: '506,000', level: '135–140' },
      { name: 'Cherubimon (White)', hp: '506,000', level: '135–140', icon: mc('Cherubimon_White_Search_Icon.png') },
    ],
    drops: [
      { item: '13,493 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [S]', icon: mc('Clone_S.png') },
      { item: 'Sweet Gold Banana', icon: mc('Sweet_gold_banana_file_Usage.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
    ],
    nextCard: 'High Rank MC Lv6',
  },
  {
    level: 'Lv6', exp: '247,000', cardIcon: mc('Monster_Card_Boss.png'),
    summons: [
      { name: 'Leviamon', hp: '617,500', level: '145–150' },
    ],
    drops: [
      { item: '16,467 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [S]', icon: mc('Clone_S.png') },
      { item: 'Sweet Gold Banana', icon: mc('Sweet_gold_banana_file_Usage.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
    ],
    nextCard: 'High Rank MC Lv6',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — Highest Cards (Lv1–3)
   ═══════════════════════════════════════════════════════════════════════════ */

const HIGHEST: CardLevel[] = [
  {
    level: 'Lv1', exp: '310,000', cardIcon: mc('Monster_Card_Boss.png'),
    summons: [
      { name: 'MarineDevimon', hp: '2,000,000', level: '155' },
      { name: 'LadyDevimon', hp: '2,000,000', level: '155' },
      { name: 'SkullSatamon', hp: '2,000,000', level: '155' },
    ],
    drops: [
      { item: '20,667 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [S]', icon: mc('Clone_S.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
    ],
    nextCard: 'Highest MC Lv2',
  },
  {
    level: 'Lv2', exp: '385,000', cardIcon: mc('Monster_Card_Boss.png'),
    summons: [
      { name: 'LordKnightmon', hp: '4,500,000', level: '160' },
      { name: 'Dynasmon', hp: '4,500,000', level: '160' },
      { name: 'Cherubimon', hp: '4,500,000', level: '160' },
      { name: 'Lucemon Satan Mode', hp: '4,500,000', level: '160', icon: mc('Lucemon_Satan_Mode_Search_Icon.png') },
      { name: 'Susanoomon', hp: '4,500,000', level: '160' },
    ],
    drops: [
      { item: '25,667 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [S]', icon: mc('Clone_S.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
    ],
    nextCard: 'Highest MC Lv3',
  },
  {
    level: 'Lv3', exp: '475,000', cardIcon: mc('Monster_Card_Boss.png'),
    summons: [
      { name: 'Sakuyamon', hp: '8,000,000', level: '165' },
    ],
    drops: [
      { item: '31,667 Bits', icon: mc('Money.png') },
      { item: 'DigiClone [S]', icon: mc('Clone_S.png') },
      { item: 'Mercenary DigiEgg', icon: mc('Mercenary_DigiEgg.png') },
      { item: 'Spirit Summon Card', icon: mc('Spirit_Summon_Card.png') },
      { item: 'BM Random Box', icon: mc('BM_Random_Box.png') },
    ],
    nextCard: 'Highest MC Lv3',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   DATA — Old Version Cards (pre-July 2018)
   ═══════════════════════════════════════════════════════════════════════════ */

interface OldCard {
  level: string;
  recommended: string;
  summons: { name: string; hp: string; level: string; icon?: string }[];
}

const OLD_CARDS: OldCard[] = [
  {
    level: 'Lv1', recommended: 'Lv 10–20',
    summons: [
      { name: 'Gabumon', hp: '9,950', level: '15' },
      { name: 'DemiDevimon', hp: '9,950', level: '15' },
      { name: 'Biyomon', hp: '9,950', level: '15' },
      { name: 'Tanemon (Mutation)', hp: '11,000', level: 'BOSS' },
    ],
  },
  {
    level: 'Lv2', recommended: 'Lv 21–30',
    summons: [
      { name: 'Leomon', hp: '12,000', level: '23–24' },
      { name: 'Garurumon', hp: '12,000', level: '25' },
      { name: 'Starmon', hp: '12,000', level: '25' },
      { name: 'Growlmon', hp: '15,500', level: 'BOSS' },
      { name: 'Devimon', hp: '15,500', level: 'BOSS' },
    ],
  },
  {
    level: 'Lv3', recommended: 'Lv 31–40',
    summons: [
      { name: 'WereGarurumon', hp: '19,000', level: '35–37' },
      { name: 'Monzaemon', hp: '20,500', level: '38–39' },
      { name: 'WaruMonzaemon', hp: '??', level: '??' },
      { name: 'WarGrowlmon', hp: '??', level: '??' },
      { name: 'SuperStarmon', hp: '??', level: '??' },
    ],
  },
  {
    level: 'Lv4', recommended: 'Lv 41–50',
    summons: [
      { name: 'SkullGreymon', hp: '37,500', level: '42–44' },
      { name: 'Cherrymon', hp: '43,500', level: '42–44' },
      { name: 'JewelBeemon', hp: '43,500', level: '46' },
      { name: 'Volcamon', hp: '??', level: '??' },
      { name: 'Andromon', hp: '??', level: 'BOSS' },
      { name: 'Mammothmon', hp: '45,000', level: 'BOSS' },
    ],
  },
  {
    level: 'Lv5', recommended: 'Lv 51–60',
    summons: [
      { name: 'Garudamon', hp: '??', level: '??' },
      { name: 'Infermon', hp: '??', level: '??' },
      { name: 'Megadramon', hp: '??', level: '??' },
      { name: 'MetalEtemon', hp: '??', level: '??' },
      { name: 'Gizumon AT', hp: '??', level: '??' },
    ],
  },
  {
    level: 'Lv6', recommended: 'Lv 61–70',
    summons: [
      { name: 'Vikemon', hp: '69,000', level: '65–66' },
      { name: 'HiAndromon', hp: '69,000', level: '65–66' },
      { name: 'MetalGarurumon', hp: '??', level: '65–66' },
      { name: 'SaberLeomon', hp: '69,000', level: '65–66' },
      { name: 'Gryphonmon', hp: '69,000', level: '65–66' },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════
   TIER CONFIG
   ═══════════════════════════════════════════════════════════════════════════ */

const TIERS = [
  { id: 'regular', label: 'Regular', sub: 'Lv1–7', cards: REGULAR, color: 'from-blue-500/20 to-blue-900/20', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', ring: 'ring-blue-500/30' },
  { id: 'high', label: 'High Rank', sub: 'Lv1–6', cards: HIGH_RANK, color: 'from-purple-500/20 to-purple-900/20', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', ring: 'ring-purple-500/30' },
  { id: 'highest', label: 'Highest', sub: 'Lv1–3', cards: HIGHEST, color: 'from-pink-500/20 to-pink-900/20', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40', ring: 'ring-pink-500/30' },
  { id: 'old', label: 'Old Version', sub: 'Pre-2018', cards: [] as CardLevel[], color: 'from-stone-500/20 to-stone-900/20', badge: 'bg-stone-500/20 text-stone-300 border-stone-500/40', ring: 'ring-stone-500/30' },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function CardRow({ card, tier }: { card: CardLevel; tier: typeof TIERS[number] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-lg border border-border/50 bg-gradient-to-r ${tier.color} overflow-hidden`}>
      {/* Header — always visible */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
      >
        <Image src={card.cardIcon} alt={card.level} width={32} height={32} className="flex-shrink-0" unoptimized />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm">{card.level}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tier.badge}`}>{card.exp} EXP</span>
            {card.nextCard && <span className="text-[10px] text-muted-foreground">→ {card.nextCard}</span>}
          </div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {card.summons.map((s) => (
              <div key={s.name} className="flex items-center gap-0.5" title={`${s.name} — HP: ${s.hp} — Lv ${s.level}`}>
                <Image
                  src={s.icon || digiIcon(s.name)}
                  alt={s.name}
                  width={20}
                  height={20}
                  className="rounded-sm"
                  unoptimized
                />
              </div>
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">HP: {card.summons[0]?.hp}</span>
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {/* Expanded details */}
      {open && (
        <div className="border-t border-border/30 p-3 space-y-3">
          {/* Summons */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Swords className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summoned Digimon</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {card.summons.map((s) => (
                <div key={s.name} className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5">
                  <Image src={s.icon || digiIcon(s.name)} alt={s.name} width={24} height={24} className="rounded-sm" unoptimized />
                  <span className="text-xs font-medium flex-1">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">HP {s.hp}</span>
                  <span className="text-[10px] text-muted-foreground">Lv {s.level}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Drops */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Gift className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Drops</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {card.drops.map((d) => (
                <div key={d.item} className="flex items-center gap-1 bg-black/20 rounded px-2 py-1" title={d.item}>
                  {d.icon && <Image src={d.icon} alt={d.item} width={18} height={18} className="flex-shrink-0" unoptimized />}
                  <span className="text-[11px]">{d.item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OldCardRow({ card }: { card: OldCard }) {
  const [open, setOpen] = useState(false);
  const tier = TIERS[3];

  return (
    <div className={`rounded-lg border border-border/50 bg-gradient-to-r ${tier.color} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left"
      >
        <Image src={mc('Monster_Card_Lv1.png')} alt={card.level} width={32} height={32} className="flex-shrink-0 opacity-50 grayscale" unoptimized />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{card.level}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${tier.badge}`}>{card.recommended}</span>
          </div>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {card.summons.slice(0, 5).map((s) => {
              const iconName = s.name.replace(/\s*\(.*\)/, '');
              const searchIcon = mc(`${iconName.replace(/\s/g, '')}_Search_Icon.png`);
              const fullIcon = mc(`${iconName.replace(/\s/g, '')}_Icon.png`);
              return (
                <div key={s.name} title={`${s.name} — HP: ${s.hp} — Lv ${s.level}`}>
                  <Image src={s.icon || searchIcon} alt={s.name} width={20} height={20} className="rounded-sm opacity-75" unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).src = fullIcon; }}
                  />
                </div>
              );
            })}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>

      {open && (
        <div className="border-t border-border/30 p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {card.summons.map((s) => {
              const iconName = s.name.replace(/\s*\(.*\)/, '');
              const searchIcon = mc(`${iconName.replace(/\s/g, '')}_Search_Icon.png`);
              const fullIcon = mc(`${iconName.replace(/\s/g, '')}_Icon.png`);
              return (
                <div key={s.name} className="flex items-center gap-2 bg-black/20 rounded px-2 py-1.5">
                  <Image src={s.icon || searchIcon} alt={s.name} width={24} height={24} className="rounded-sm" unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).src = fullIcon; }}
                  />
                  <span className="text-xs font-medium flex-1">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">HP {s.hp}</span>
                  {s.level === 'BOSS' ? (
                    <span className="text-[10px] font-bold text-red-400">BOSS</span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Lv {s.level}</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Location: D-Terminal Underground Summon Square only
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXP OVERVIEW TABLE
   ═══════════════════════════════════════════════════════════════════════════ */

function ExpTable() {
  const allCards = [
    ...REGULAR.map(c => ({ ...c, tier: 'Regular', badge: TIERS[0].badge })),
    ...HIGH_RANK.map(c => ({ ...c, tier: 'High Rank', badge: TIERS[1].badge })),
    ...HIGHEST.map(c => ({ ...c, tier: 'Highest', badge: TIERS[2].badge })),
  ];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Card</th>
            <th className="text-left py-1.5 px-2 font-semibold text-muted-foreground">Tier</th>
            <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">EXP</th>
            <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">Summon HP</th>
            <th className="text-right py-1.5 px-2 font-semibold text-muted-foreground">Summon Lv</th>
          </tr>
        </thead>
        <tbody>
          {allCards.map((c) => (
            <tr key={`${c.tier}-${c.level}`} className="border-b border-border/20 hover:bg-white/5">
              <td className="py-1 px-2 flex items-center gap-1.5">
                <Image src={c.cardIcon} alt="" width={18} height={18} unoptimized />
                <span className="font-medium">{c.level}</span>
              </td>
              <td className="py-1 px-2"><span className={`text-[10px] px-1.5 py-0.5 rounded border ${c.badge}`}>{c.tier}</span></td>
              <td className="py-1 px-2 text-right font-mono">{c.exp}</td>
              <td className="py-1 px-2 text-right font-mono">{c.summons[0]?.hp || '—'}</td>
              <td className="py-1 px-2 text-right">{c.summons[0]?.level || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RANDOM MONSTER CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function RandomCardSection() {
  return (
    <div className="rounded-lg border border-border/50 bg-gradient-to-r from-amber-500/10 to-orange-900/10 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Image src={mc('Random_Monster_Card.png')} alt="Random Monster Card" width={32} height={32} unoptimized />
        <div>
          <h3 className="font-bold text-sm">Random Monster Card</h3>
          <p className="text-[11px] text-muted-foreground">Obtained from Server Continent Pyramid by scanning DigiCores</p>
        </div>
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <p>When scanned, randomly gives one of the regular Monster Cards (Lv1–Lv7). Higher level cards are rarer.</p>
        <div className="flex flex-wrap gap-2 mt-2">
          {REGULAR.map(c => (
            <div key={c.level} className="flex items-center gap-1 bg-black/20 rounded px-2 py-1">
              <Image src={c.cardIcon} alt={c.level} width={16} height={16} unoptimized />
              <span className="text-[10px]">{c.level}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

export function MonsterCardPage() {
  const [activeTab, setActiveTab] = useState('regular');

  const activeTier = TIERS.find(t => t.id === activeTab)!;

  return (
    <div className="container py-8 max-w-4xl">
      {/* Back link */}
      <Link href="/systems" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Systems
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Image src={mc('Monster_Card_Lv7.png')} alt="Monster Card" width={40} height={40} unoptimized />
          <div>
            <h1 className="text-3xl font-bold">Monster Card System</h1>
            <p className="text-sm text-muted-foreground">Summon Digimon, defeat them, collect drops & EXP</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Monster Cards are consumable items that summon Digimon for you to battle. They come in three tiers:
          <strong className="text-blue-400"> Regular</strong> (Lv1–7),
          <strong className="text-purple-400"> High Rank</strong> (Lv1–6), and
          <strong className="text-pink-400"> Highest</strong> (Lv1–3).
          Each defeated Digimon drops items, Bits, and a card for the next level, letting you chain cards continuously.
          Higher tiers offer dramatically more EXP, better drops, and tougher opponents.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { icon: '1', title: 'Obtain', desc: 'Get cards from quests, drops, or the Random Card from Pyramid' },
          { icon: '2', title: 'Use & Fight', desc: 'Use a card to summon Digimon, defeat them for EXP & drops' },
          { icon: '3', title: 'Chain', desc: 'Defeated Digimon drop the next card level — keep chaining!' },
        ].map((step) => (
          <div key={step.icon} className="text-center rounded-lg border border-border/30 bg-card/50 p-3">
            <div className="w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center mx-auto mb-2">{step.icon}</div>
            <h3 className="text-xs font-bold mb-0.5">{step.title}</h3>
            <p className="text-[10px] text-muted-foreground leading-tight">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Random card */}
      <div className="mb-8">
        <RandomCardSection />
      </div>

      {/* EXP overview (collapsible) */}
      <details className="mb-8 rounded-lg border border-border/50 bg-card/30">
        <summary className="flex items-center gap-2 p-3 cursor-pointer hover:bg-white/5 transition-colors">
          <Info className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">EXP & Stats Overview</span>
          <span className="text-[10px] text-muted-foreground ml-auto">Click to expand</span>
        </summary>
        <div className="p-3 pt-0">
          <ExpTable />
        </div>
      </details>

      {/* Tier tabs */}
      <div className="flex gap-1 mb-4 rounded-lg bg-card/50 border border-border/30 p-1">
        {TIERS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => setActiveTab(tier.id)}
            className={`flex-1 text-center py-2 px-3 rounded-md text-xs font-semibold transition-all ${
              activeTab === tier.id
                ? `bg-gradient-to-r ${tier.color} ring-1 ${tier.ring} text-foreground`
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <div>{tier.label}</div>
            <div className="text-[10px] font-normal opacity-70">{tier.sub}</div>
          </button>
        ))}
      </div>

      {/* Card list for active tier */}
      <div className="space-y-2">
        {activeTab !== 'old' ? (
          activeTier.cards.length > 0 ? (
            (activeTab === 'regular' ? REGULAR : activeTab === 'high' ? HIGH_RANK : HIGHEST).map((card) => (
              <CardRow key={card.level} card={card} tier={activeTier} />
            ))
          ) : null
        ) : (
          <>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 mb-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold text-amber-300 mb-1">Discontinued — July 2018</p>
                <p>These old Monster Cards were replaced with the current system. They could only be used in the <strong>D-Terminal Underground Summon Square</strong> and had lower HP values, different summoned Digimon, and different recommended levels. The old cards included Lv1–Lv6 only.</p>
              </div>
            </div>
            {OLD_CARDS.map((card) => (
              <OldCardRow key={card.level} card={card} />
            ))}
          </>
        )}
      </div>

      {/* Tips */}
      <div className="mt-8 rounded-lg border border-border/50 bg-card/30 p-4">
        <h3 className="text-sm font-bold mb-3">Tips & Notes</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>Chain cards continuously — each defeated summon drops the next card level</li>
          <li>Regular Lv7 drops another Lv7, so you can farm it infinitely</li>
          <li>DigiClone quality scales with tier: D (Lv1–3) → C (Lv4) → B (Lv5–6) → A (Lv7 & High Rank) → S (High Rank 3+)</li>
          <li>High Rank and Highest cards give dramatically more EXP per card</li>
          <li>Spirit Summon Cards from drops can be used for element-specific farming</li>
          <li>BM/Riding Random Boxes only drop from Lv5+ cards</li>
          <li>The Random Monster Card from Server Continent Pyramid gives a random Lv1–Lv7</li>
          <li>Highest Lv3 (Sakuyamon) has 8,000,000 HP — bring your strongest team!</li>
        </ul>
      </div>
    </div>
  );
}
