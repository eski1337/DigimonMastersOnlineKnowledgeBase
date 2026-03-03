import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Monster Card System - DMO KB',
  description: 'Complete guide to the Monster Card system in Digimon Masters Online. All card levels, summoned Digimon, drops, experience values, and tiers explained.',
};

/* ────────────────────────────────────────────────────────────────────────────
   DATA
   ──────────────────────────────────────────────────────────────────────────── */

interface CardLevel {
  level: string;
  exp: string;
  summons: { name: string; hp: string; level: string }[];
  drops: { item: string; desc: string }[];
  bitDrop?: string;
  nextCard?: string;
}

const REGULAR_CARDS: CardLevel[] = [
  {
    level: 'Lv1', exp: '3,307',
    summons: [
      { name: 'Patamon', hp: '9,840', level: '30' },
      { name: 'Renamon', hp: '9,840', level: '30' },
      { name: 'Guilmon', hp: '9,840', level: '30' },
      { name: 'Veemon', hp: '9,840', level: '30' },
      { name: 'Drimogemon', hp: '9,840', level: '30' },
    ],
    drops: [
      { item: 'Bits', desc: '220 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Chicken Combo', desc: 'Restore HP 1600 & DS 1200' },
      { item: 'Gold Banana', desc: 'Restore HP 2000 & DS 2000' },
      { item: 'DigiClone [D]', desc: 'Reinforcement material (Lv 1~3)' },
      { item: 'Digimon Seals', desc: 'Patamon / Renamon / Guilmon / Veemon / Drimogemon' },
      { item: 'Mercenary DigiEggs', desc: 'Drimogemon / Patamon / Guilmon / Renamon / Veemon' },
      { item: 'Low Class DATA DigiEggs', desc: 'Beast' },
      { item: 'High Class Dragon DigiEgg', desc: 'Rank 6 / High Class' },
      { item: 'DigiEgg (for return) Class 1', desc: 'Refund Amount 25' },
      { item: 'Attributes Rank A', desc: 'HP / DS / AT / DE' },
      { item: 'MS Attribute Rank A', desc: '1~2% Speed' },
      { item: 'Seal Exchange Ticket', desc: 'Exchange at Digitamamon DATS Center' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'Mode Selector', desc: 'Expand riding function' },
      { item: 'Mystery Digi-Egg Box', desc: 'Random Armor digi-egg (100% success)' },
    ],
    nextCard: 'Monster Card Lv2',
  },
  {
    level: 'Lv2', exp: '4,907',
    summons: [
      { name: 'Goblimon', hp: '13,680', level: '40' },
      { name: 'Keramon', hp: '13,680', level: '40' },
      { name: 'Mushroomon', hp: '13,680', level: '40' },
      { name: 'Tentomon', hp: '13,680', level: '40' },
      { name: 'Dracmon', hp: '13,680', level: '40' },
    ],
    drops: [
      { item: 'Bits', desc: '327 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Chicken Combo', desc: 'Restore HP 1600 & DS 1200' },
      { item: 'Gold Banana', desc: 'Restore HP 2000 & DS 2000' },
      { item: 'DigiClone [D]', desc: 'Reinforcement material (Lv 1~3)' },
      { item: 'Digimon Seals', desc: 'Mushroomon / Tentomon / Dracmon / Keramon / Goblimon' },
      { item: 'Mercenary DigiEggs', desc: 'Dracmon / Goblimon / Mushroomon / Tentomon / Keramon' },
      { item: 'Low Class DATA DigiEggs', desc: 'Insectoid / Devil' },
      { item: 'High Class Plant DigiEgg', desc: 'Rank 1 / High Class' },
      { item: 'DigiEgg (for return) Class 1', desc: 'Refund Amount 25' },
      { item: 'Attributes Rank A', desc: 'HP / DS / AT / DE' },
      { item: 'MS Attribute Rank A', desc: '1~2% Speed' },
      { item: 'Seal Exchange Ticket', desc: 'Exchange at Digitamamon DATS Center' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'Mode Selector', desc: 'Expand riding function' },
      { item: 'Mystery Digi-Egg Box', desc: 'Random Armor digi-egg (100% success)' },
    ],
    nextCard: 'Monster Card Lv3',
  },
  {
    level: 'Lv3', exp: '6,475',
    summons: [
      { name: 'Woodmon', hp: '21,720', level: '50' },
      { name: 'Sangloupmon', hp: '21,720', level: '50' },
      { name: 'Waspmon', hp: '21,720', level: '50' },
      { name: 'Flymon', hp: '21,720', level: '50' },
      { name: 'Veedramon', hp: '21,720', level: '50' },
    ],
    drops: [
      { item: 'Bits', desc: '431 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Chicken Combo', desc: 'Restore HP 1600 & DS 1200' },
      { item: 'Gold Banana', desc: 'Restore HP 2000 & DS 2000' },
      { item: 'DigiClone [D]', desc: 'Reinforcement material (Lv 1~3)' },
      { item: 'Digimon Seals', desc: 'Woodmon / Waspmon / Sangloupmon / Veedramon / Flymon' },
      { item: 'Mysterious Top Quality Egg', desc: 'Digicore, Evoluter or Amplification Booster +200%' },
      { item: 'Mercenary DigiEggs', desc: 'Dracmon / Woodmon / Kunemon / Kiwimon / Veedramon' },
      { item: 'Low Class DATA DigiEggs', desc: 'Plant / Devil / Rock / Insect' },
      { item: 'DigiEgg (for return) Class 2', desc: 'Refund Amount 100' },
      { item: 'Attributes Rank B', desc: 'HP / DS / AT / DE' },
      { item: 'MS Attribute Rank A', desc: '1~3% Speed' },
      { item: 'Seal Exchange Ticket', desc: 'Exchange at Digitamamon DATS Center' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'Mode Selector', desc: 'Expand riding function' },
      { item: 'Mystery Digi-Egg Box', desc: 'Random Armor digi-egg (100% success)' },
    ],
    nextCard: 'Monster Card Lv4',
  },
  {
    level: 'Lv4', exp: '8,435',
    summons: [
      { name: 'Centarumon', hp: '34,560', level: '60' },
      { name: 'Devimon', hp: '34,560', level: '60' },
      { name: 'Kyubimon', hp: '34,560', level: '60' },
      { name: 'Leomon', hp: '34,560', level: '60' },
      { name: 'Meramon', hp: '34,560', level: '60' },
    ],
    drops: [
      { item: 'Bits', desc: '562 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Chicken Combo', desc: 'Restore HP 1600 & DS 1200' },
      { item: 'Gold Banana', desc: 'Restore HP 2000 & DS 2000' },
      { item: 'DigiClone [C]', desc: 'Reinforcement material (Lv 4~6)' },
      { item: 'Digimon Seals', desc: 'Centarumon / Devimon / Kyubimon / Leomon / Meramon' },
      { item: 'Mysterious Top Quality Egg', desc: 'Unknown DigiEgg' },
      { item: 'Mercenary DigiEggs', desc: 'Tsukaimon / Renamon / Elecmon / DemiMeramon' },
      { item: 'High Class Dragon DigiEgg', desc: 'Rank 6 / High Class' },
      { item: 'Low Class DATA DigiEggs', desc: 'Fire / Beast / Devil' },
      { item: 'DigiEgg (for return) Class 2', desc: 'Refund Amount 100' },
      { item: 'Attributes Rank B', desc: 'HP / DS / AT / DE' },
      { item: 'MS Attribute Rank A', desc: '1~2% Speed' },
      { item: 'Seal Exchange Ticket', desc: 'Exchange at Digitamamon DATS Center' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'Mode Selector', desc: 'Expand riding function' },
      { item: 'Mystery Digi-Egg Box', desc: 'Random Armor digi-egg (100% success)' },
    ],
    nextCard: 'Monster Card Lv5',
  },
  {
    level: 'Lv5', exp: '20,465',
    summons: [
      { name: 'Cherrymon', hp: '60,360', level: '70' },
      { name: 'Sinduramon', hp: '60,360', level: '70' },
      { name: 'Knightmon', hp: '60,360', level: '70' },
      { name: 'WaruMonzaemon', hp: '60,360', level: '70' },
      { name: 'NeoDevimon', hp: '60,360', level: '70' },
    ],
    drops: [
      { item: 'Bits', desc: '1,364 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Chicken Combo', desc: 'Restore HP 1600 & DS 1200' },
      { item: 'Gold Banana', desc: 'Restore HP 2000 & DS 2000' },
      { item: 'DigiClone [B]', desc: 'Reinforcement material (Lv 7~9)' },
      { item: 'Digimon Seals', desc: 'Cherrymon / Sinduramon / Knightmon / WaruMonzaemon / NeoDevimon' },
      { item: 'Mysterious Top Quality Egg', desc: 'Digicore, Evoluter or Amplification Booster +200%' },
      { item: 'Mercenary DigiEggs', desc: 'Tsukaimon / Gladimon / Woodmon / Kiwimon' },
      { item: 'Low Class DATA DigiEggs', desc: 'Plant / Devil / Rock' },
      { item: 'DigiEgg (for return) Class 3', desc: 'Refund Amount 150' },
      { item: 'Attributes Rank B', desc: 'HP / DS / AT / DE' },
      { item: 'MS Attribute Rank A', desc: '1~3% Speed' },
      { item: 'Seal Exchange Ticket', desc: 'Exchange at Digitamamon DATS Center' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'Monster Card Lv6',
  },
  {
    level: 'Lv6', exp: '22,495',
    summons: [
      { name: 'Marin Devimon', hp: '99,240', level: '80' },
      { name: 'Etemon', hp: '99,240', level: '80' },
      { name: 'Giromon', hp: '99,240', level: '80' },
      { name: 'WereGarurumon', hp: '99,240', level: '80' },
      { name: 'SkullGreymon', hp: '99,240', level: '80' },
    ],
    drops: [
      { item: 'Bits', desc: '833 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Chicken Combo', desc: 'Restore HP 1600 & DS 1200' },
      { item: 'Gold Banana', desc: 'Restore HP 2000 & DS 2000' },
      { item: 'DigiClone [B]', desc: 'Reinforcement material (Lv 7~9)' },
      { item: 'Digimon Seals', desc: 'Marin Devimon / Etemon / Giromon / WereGarurumon / SkullGreymon' },
      { item: 'Mysterious Top Quality Egg', desc: 'Digicore, Evoluter or Amplification Booster +200%' },
      { item: 'Mercenary DigiEggs', desc: 'Drimogemon / Goblimon / Syakomon / Gabumon' },
      { item: 'Low Class DATA DigiEggs', desc: 'Beast / Devil / Rock' },
      { item: 'High Class Aquatic DigiEgg', desc: 'Rank 1 / High Class' },
      { item: 'DigiEgg (for return) Class 4', desc: 'Refund Amount 200' },
      { item: 'Attributes Rank C', desc: 'HP / DS / AT / DE' },
      { item: 'MS Attribute Rank B', desc: '2~4% Speed' },
      { item: 'Seal Exchange Ticket', desc: 'Exchange at Digitamamon DATS Center' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'Monster Card Lv7',
  },
  {
    level: 'Lv7', exp: '24,525',
    summons: [
      { name: 'Kimeramon', hp: '170,760', level: '90' },
      { name: 'Diablomon', hp: '170,760', level: '90' },
      { name: 'Parasimon', hp: '170,760', level: '90' },
      { name: 'DexDoruGreymon', hp: '170,760', level: '90' },
      { name: 'SaberLeomon', hp: '170,760', level: '90' },
    ],
    drops: [
      { item: 'Bits', desc: '1,635 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Chicken Combo', desc: 'Restore HP 1600 & DS 1200' },
      { item: 'Gold Banana', desc: 'Restore HP 2000 & DS 2000' },
      { item: 'DigiClone [A]', desc: 'Reinforcement material (Lv 10~12)' },
      { item: 'Digimon Seals', desc: 'Chimairamon / SaberLeomon / DexDoruGreymon / Parasimon / Diablomon' },
      { item: 'Mercenary DigiEggs', desc: 'Keramon / Dokunemon / Elecmon / DexDorugamon / Gazimon (Millenniumon)' },
      { item: 'Low Class DATA DigiEggs', desc: 'Beast / Devil / Insectoid' },
      { item: 'DigiEgg (for return) Class 5', desc: 'Refund Amount 250' },
      { item: 'Attributes Rank D', desc: 'HP / DS / AT / DE' },
      { item: 'MS Attribute Rank B', desc: '2~4% Speed' },
      { item: 'Seal Exchange Ticket', desc: 'Exchange at Digitamamon DATS Center' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'Monster Card Lv7 (self)',
  },
];

const HIGH_RANK_CARDS: CardLevel[] = [
  {
    level: 'Lv1', exp: '73,520',
    summons: [
      { name: 'Anubismon', hp: '183,800', level: '98–100' },
      { name: 'MetalEtemon', hp: '183,800', level: '98–100' },
      { name: 'Boltmon', hp: '183,800', level: '98–100' },
      { name: 'GrandKuwagamon', hp: '183,800', level: '98–100' },
      { name: 'DinoTigermon', hp: '183,800', level: '98–100' },
    ],
    drops: [
      { item: 'Bits', desc: '4,901 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Double Chicken Combo', desc: 'Restore HP 2000 & DS 1600' },
      { item: 'Sweet Gold Banana', desc: 'Restore HP and DS 4000' },
      { item: 'DigiClone [A]', desc: 'Reinforcement material (Lv 9~12)' },
      { item: 'Mercenary DigiEggs', desc: 'Kunemon / Gotsumon / Doggymon / DemiMeramon / Bearmon' },
      { item: 'Low Class DigiEggs', desc: 'Beast / Devil / Rock / Insect / Fire' },
      { item: 'DigiEgg (for return)', desc: 'Refund Amount 200' },
      { item: 'Attributes', desc: 'HP / DS / AT / DE (Rank A Lv4)' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'High Rank MC Lv2',
  },
  {
    level: 'Lv2', exp: '98,360',
    summons: [
      { name: 'HiAndromon', hp: '245,900', level: '108–110' },
      { name: 'Brakedramon', hp: '245,900', level: '108–110' },
      { name: 'Gryphonmon', hp: '245,900', level: '108–110' },
      { name: 'Slayerdramon', hp: '245,900', level: '108–110' },
      { name: 'TigerVespamon', hp: '245,900', level: '108–110' },
    ],
    drops: [
      { item: 'Bits', desc: '6,557 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Double Chicken Combo', desc: 'Restore HP 2000 & DS 1600' },
      { item: 'DigiClone [A]', desc: 'Reinforcement material (Lv 9~12)' },
      { item: 'Mercenary DigiEggs', desc: 'Drimogemon / Dracomon (Green) / Kiwimon / Dracomon (Blue) / Fanbeemon' },
      { item: 'DigiEgg (for return)', desc: 'Refund Amount 250' },
      { item: 'Attributes', desc: 'HP / DS / AT / DE' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'High Rank MC Lv3',
  },
  {
    level: 'Lv3', exp: '128,120',
    summons: [
      { name: 'Vikemon', hp: '320,300', level: '118–120' },
      { name: 'Justimon', hp: '320,300', level: '118–120' },
      { name: 'GrandisKuwagamon', hp: '320,300', level: '118–120' },
      { name: 'GranDracmon', hp: '320,300', level: '118–120' },
      { name: 'HerculesKabuterimon', hp: '320,300', level: '118–120' },
    ],
    drops: [
      { item: 'Bits', desc: '8,541 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Double Chicken Combo', desc: 'Restore HP 2000 & DS 1600' },
      { item: 'Sweet Gold Banana', desc: 'Restore HP and DS 4000' },
      { item: 'DigiClone [S]', desc: 'Reinforcement material (Lv 13~15)' },
      { item: 'Mercenary DigiEggs', desc: 'Gomamon / Monodramon / Wormmon / Dracmon / Tentomon' },
      { item: 'DigiEgg (for return)', desc: 'Refund Amount 250' },
      { item: 'Attributes', desc: 'HP / DS / AT / DE' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'High Rank MC Lv4',
  },
  {
    level: 'Lv4', exp: '163,280',
    summons: [
      { name: 'Piedmon', hp: '408,200', level: '130+' },
      { name: 'Mugendramon', hp: '408,200', level: '130+' },
      { name: 'VenomMyotismon', hp: '408,200', level: '130+' },
      { name: 'Puppetmon', hp: '408,200', level: '130+' },
      { name: 'MetalSeadramon', hp: '408,200', level: '130+' },
    ],
    drops: [
      { item: 'Bits', desc: '10,201 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Double Chicken Combo', desc: 'Restore HP 2000 & DS 1600' },
      { item: 'Sweet Gold Banana', desc: 'Restore HP and DS 4000' },
      { item: 'DigiClone [S]', desc: 'Reinforcement material (Lv 13~15)' },
      { item: 'Mercenary DigiEggs', desc: 'Woodmon / Mechanorimon / Betamon' },
      { item: 'DigiEgg (for return)', desc: 'Refund Amount 250' },
      { item: 'Attributes', desc: 'HP / DS / AT / DE' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'High Rank MC Lv5',
  },
  {
    level: 'Lv5', exp: '204,320',
    summons: [
      { name: 'DexDorugoramon', hp: '490,446', level: '140+' },
      { name: 'Seraphimon', hp: '490,446', level: '140+' },
      { name: 'Cherubimon (White)', hp: '490,446', level: '140+' },
    ],
    drops: [
      { item: 'Bits', desc: '13,621 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Double Chicken Combo', desc: 'Restore HP 2000 & DS 1600' },
      { item: 'Sweet Gold Banana', desc: 'Restore HP and DS 4000' },
      { item: 'DigiClone [S]', desc: 'Reinforcement material (Lv 13~15)' },
      { item: 'Mercenary DigiEggs', desc: 'Patamon / Lopmon / Dorumon (DexDorugamon)' },
      { item: 'Low Class DigiEggs', desc: 'Beast' },
      { item: 'DigiEgg (for return)', desc: 'Refund Amount 300' },
      { item: 'Attributes', desc: 'HP / DS / AT / DE' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'High Rank MC Lv6',
  },
  {
    level: 'Lv6', exp: '251,640',
    summons: [
      { name: 'Lilithmon', hp: '629,100', level: '150+' },
      { name: 'Daemon', hp: '629,100', level: '150+' },
      { name: 'Leviamon', hp: '629,100', level: '150+' },
    ],
    drops: [
      { item: 'Bits', desc: '16,776 Game Currency' },
      { item: 'Evoluter', desc: 'Force Expand Digimon\'s Evolution Slot' },
      { item: 'Double Chicken Combo', desc: 'Restore HP 2000 & DS 1600' },
      { item: 'Sweet Gold Banana', desc: 'Restore HP and DS 4000' },
      { item: 'DigiClone [S]', desc: 'Reinforcement material (Lv 13~15)' },
      { item: 'DigiEgg (for return)', desc: 'Refund Amount 450' },
      { item: 'Attributes', desc: 'HP / DS / AT / DE' },
      { item: 'Spirit Summon Card', desc: 'Summon Spirit Digimon with matching element' },
      { item: 'BM Random Box', desc: 'Random Burst Mode item' },
      { item: 'Random Riding Box', desc: 'Random Riding Mode item' },
    ],
    nextCard: 'High Rank MC Lv6 (self)',
  },
];

const HIGHEST_CARDS: CardLevel[] = [
  {
    level: 'Lv1', exp: '3,308,400 (Solo)',
    summons: [
      { name: 'MarineDevimon', hp: '1,838,000', level: '100' },
      { name: 'LadyDevimon', hp: '1,838,000', level: '100' },
      { name: 'MaloMyotismon', hp: '1,838,000', level: '100' },
      { name: 'Demon', hp: '1,838,000', level: '100' },
      { name: 'SkullSatamon', hp: '1,838,000', level: '100' },
    ],
    drops: [{ item: 'Bits', desc: '77 Game Currency' }],
  },
  {
    level: 'Lv2', exp: '4,426,200 (Solo)',
    summons: [
      { name: 'LordKnightmon', hp: '2,459,000', level: '115' },
      { name: 'Dynasmon', hp: '2,459,000', level: '115' },
      { name: 'Cherubimon', hp: '2,459,000', level: '115' },
      { name: 'Lucemon Satan Mode', hp: '2,459,000', level: '115' },
      { name: 'Susanoomon', hp: '4,918,000', level: '115' },
    ],
    drops: [{ item: 'Bits', desc: '231 Game Currency' }],
  },
  {
    level: 'Lv3', exp: 'Unknown',
    summons: [
      { name: 'Sakuyamon', hp: 'Unknown', level: '130' },
    ],
    drops: [{ item: 'Bits', desc: '346 Game Currency' }],
  },
];

const RANDOM_CARD_TABLE = [
  { card: 'Monster Card Lv1', level: 'Lv 10–20' },
  { card: 'Monster Card Lv2', level: 'Lv 21–30' },
  { card: 'Monster Card Lv3', level: 'Lv 31–40' },
  { card: 'Monster Card Lv4', level: 'Lv 41–50' },
  { card: 'Monster Card Lv5', level: 'Lv 51–60' },
  { card: 'Monster Card Lv6', level: 'Lv 61–70' },
];

const EXP_OVERVIEW = [
  { name: 'MC Lv1', exp: '3,307', tier: 'regular' },
  { name: 'MC Lv2', exp: '4,907', tier: 'regular' },
  { name: 'MC Lv3', exp: '6,475', tier: 'regular' },
  { name: 'MC Lv4', exp: '8,435', tier: 'regular' },
  { name: 'MC Lv5', exp: '20,465', tier: 'regular' },
  { name: 'MC Lv6', exp: '22,495', tier: 'regular' },
  { name: 'MC Lv7', exp: '24,525', tier: 'regular' },
  { name: 'HR MC Lv1', exp: '73,520', tier: 'high' },
  { name: 'HR MC Lv2', exp: '98,360', tier: 'high' },
  { name: 'HR MC Lv3', exp: '128,120', tier: 'high' },
  { name: 'HR MC Lv4', exp: '163,280', tier: 'high' },
  { name: 'HR MC Lv5', exp: '204,320', tier: 'high' },
  { name: 'HR MC Lv6', exp: '251,640', tier: 'high' },
  { name: 'Highest Lv1', exp: '3,308,400', tier: 'highest' },
  { name: 'Highest Lv2', exp: '4,426,200', tier: 'highest' },
  { name: 'Highest Lv3', exp: '???', tier: 'highest' },
];

/* ────────────────────────────────────────────────────────────────────────────
   COMPONENTS
   ──────────────────────────────────────────────────────────────────────────── */

function TocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors block py-0.5">
      {children}
    </a>
  );
}

function SectionHeading({ id, children, color = 'text-orange-400' }: { id: string; children: React.ReactNode; color?: string }) {
  return (
    <h2 id={id} className={`text-2xl font-bold ${color} scroll-mt-20 border-b border-border/40 pb-2 mb-4`}>
      {children}
    </h2>
  );
}

function CardTierSection({ title, id, cards, color, borderColor, bgColor }: {
  title: string; id: string;
  cards: CardLevel[];
  color: string; borderColor: string; bgColor: string;
}) {
  return (
    <section>
      <SectionHeading id={id} color={color}>{title}</SectionHeading>
      <div className="space-y-6">
        {cards.map((card, idx) => (
          <div key={idx} id={`${id}-${card.level.toLowerCase().replace(/\s/g, '')}`}
            className={`rounded-xl border ${borderColor} overflow-hidden`}>
            {/* Card Header */}
            <div className={`${bgColor} px-5 py-3 flex flex-wrap items-center justify-between gap-2`}>
              <h3 className="text-lg font-bold text-white">
                {title.replace(' Cards', '')} {card.level}
              </h3>
              <div className="flex items-center gap-4 text-sm text-white/80">
                <span>EXP: <strong className="text-white">{card.exp}</strong></span>
                {card.nextCard && (
                  <span className="text-xs opacity-70">Drops → {card.nextCard}</span>
                )}
              </div>
            </div>

            {/* Summons */}
            <div className="p-4 border-b border-border/30">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Summoned Digimon</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                {card.summons.map((s, i) => (
                  <div key={i} className={`flex items-center gap-2 p-2 rounded-lg ${bgColor.replace('bg-gradient-to-r', 'bg-gradient-to-br').replace('/80', '/10').replace('/70', '/10')} border ${borderColor.replace('/30', '/20')}`}>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-foreground truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        HP: {s.hp} &middot; Lv {s.level}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Drops */}
            <div className="p-4">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Drops</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                {card.drops.map((d, i) => (
                  <div key={i} className="flex items-start gap-2 py-1.5 border-b border-border/10 last:border-0">
                    <span className="font-medium text-sm text-foreground whitespace-nowrap">{d.item}</span>
                    <span className="text-xs text-muted-foreground flex-1 text-right">{d.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
   PAGE
   ──────────────────────────────────────────────────────────────────────────── */

export default function MonsterCardPage() {
  return (
    <div className="container py-8 max-w-7xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href="/systems" className="hover:text-foreground transition-colors">Systems</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Monster Card</span>
      </nav>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_240px] gap-8">
        {/* ── Main Content ── */}
        <div className="space-y-10 min-w-0">
          {/* Hero */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
              Monster Card System
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">
              Monster Cards are consumable items that summon Digimon enemies for you to fight. 
              They provide <strong className="text-foreground">experience points</strong>, <strong className="text-foreground">item drops</strong>, and are one of the primary farming methods in Digimon Masters Online. 
              Cards come in three tiers — <span className="text-blue-400 font-semibold">Regular</span>, <span className="text-purple-400 font-semibold">High Rank</span>, and <span className="text-pink-400 font-semibold">Highest</span> — each with increasing difficulty and rewards.
            </p>
          </div>

          {/* Quick Overview */}
          <section>
            <SectionHeading id="overview" color="text-blue-400">Experience Overview</SectionHeading>
            <p className="text-sm text-muted-foreground mb-4">Base EXP earned per card across all tiers. Higher cards give dramatically more experience.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Card</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Base EXP</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Tier</th>
                  </tr>
                </thead>
                <tbody>
                  {EXP_OVERVIEW.map((row, i) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-medium">{row.name}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-foreground">{row.exp}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          row.tier === 'regular' ? 'bg-blue-500/20 text-blue-300' :
                          row.tier === 'high' ? 'bg-purple-500/20 text-purple-300' :
                          'bg-pink-500/20 text-pink-300'
                        }`}>
                          {row.tier === 'regular' ? 'Regular' : row.tier === 'high' ? 'High Rank' : 'Highest'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* How it Works */}
          <section>
            <SectionHeading id="how-it-works" color="text-emerald-400">How Monster Cards Work</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="text-2xl mb-2">📦</div>
                <h3 className="font-bold text-foreground mb-1">1. Obtain Cards</h3>
                <p className="text-sm text-muted-foreground">Monster Cards drop from defeated enemies, are rewarded from quests, or can be purchased. Random Monster Cards drop in Server Continent Pyramid.</p>
              </div>
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="text-2xl mb-2">⚔️</div>
                <h3 className="font-bold text-foreground mb-1">2. Use the Card</h3>
                <p className="text-sm text-muted-foreground">Using a card summons a random Digimon enemy from that card&apos;s pool. The Digimon&apos;s level and HP scale with the card tier.</p>
              </div>
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="text-2xl mb-2">🎁</div>
                <h3 className="font-bold text-foreground mb-1">3. Collect Drops</h3>
                <p className="text-sm text-muted-foreground">Defeating the summoned Digimon gives EXP, Bits, and various item drops including Seals, DigiEggs, DigiClones, and higher-level cards.</p>
              </div>
            </div>
          </section>

          {/* Random Monster Card */}
          <section>
            <SectionHeading id="random-card" color="text-amber-400">Random Monster Card</SectionHeading>
            <p className="text-sm text-muted-foreground mb-3">
              Drops in <strong className="text-foreground">Server Continent Pyramid</strong>. Scanning it gives one of the following cards:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Card</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Recommended Level</th>
                  </tr>
                </thead>
                <tbody>
                  {RANDOM_CARD_TABLE.map((row, i) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-3 font-medium">{row.card}</td>
                      <td className="py-2 px-3 text-muted-foreground">{row.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Regular Monster Cards */}
          <CardTierSection
            title="Monster Cards"
            id="regular"
            cards={REGULAR_CARDS}
            color="text-blue-400"
            borderColor="border-blue-500/30"
            bgColor="bg-gradient-to-r from-blue-600/80 to-blue-500/70"
          />

          {/* High Rank Monster Cards */}
          <CardTierSection
            title="High Rank Monster Cards"
            id="high-rank"
            cards={HIGH_RANK_CARDS}
            color="text-purple-400"
            borderColor="border-purple-500/30"
            bgColor="bg-gradient-to-r from-purple-600/80 to-purple-500/70"
          />

          {/* Highest Monster Cards */}
          <CardTierSection
            title="Highest Monster Cards"
            id="highest"
            cards={HIGHEST_CARDS}
            color="text-pink-400"
            borderColor="border-pink-500/30"
            bgColor="bg-gradient-to-r from-pink-600/80 to-pink-500/70"
          />

          {/* Tips */}
          <section>
            <SectionHeading id="tips" color="text-yellow-400">Tips &amp; Notes</SectionHeading>
            <div className="space-y-3">
              {[
                'Lower-level cards (Lv1–4) can drop the next card level, letting you chain-farm upward.',
                'Starting from Lv5, cards can drop BM Random Box and Random Riding Box — valuable items.',
                'High Rank cards give significantly more EXP and better attribute ranks than regular cards.',
                'Highest Monster Cards summon boss-level Digimon with millions of HP — bring strong Digimon!',
                'Highest Lv2 features Susanoomon with double HP (4,918,000) compared to other summons.',
                'Spirit Summon Cards from drops let you summon Spirit Digimon matching the element of the defeated Digimon.',
                'DigiClone grades scale with card level: [D] for Lv1–3, [C] for Lv4, [B] for Lv5–6, [A] for Lv7 & HR Lv1–2, [S] for HR Lv3+.',
                'Seal Exchange Tickets can be traded at Digitamamon in DATS Center for various Digimon seals.',
              ].map((tip, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/15">
                  <span className="text-yellow-400 font-bold text-sm flex-shrink-0">💡</span>
                  <p className="text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── Sidebar TOC ── */}
        <aside className="hidden xl:block">
          <div className="sticky top-20 space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">On this page</h3>
            <TocLink href="#overview">Experience Overview</TocLink>
            <TocLink href="#how-it-works">How It Works</TocLink>
            <TocLink href="#random-card">Random Monster Card</TocLink>
            <div className="pt-2 pb-1">
              <span className="text-xs font-bold text-blue-400">Regular (Lv1–7)</span>
            </div>
            {REGULAR_CARDS.map(c => (
              <TocLink key={c.level} href={`#regular-${c.level.toLowerCase()}`}>&nbsp;&nbsp;{c.level}</TocLink>
            ))}
            <div className="pt-2 pb-1">
              <span className="text-xs font-bold text-purple-400">High Rank (Lv1–6)</span>
            </div>
            {HIGH_RANK_CARDS.map(c => (
              <TocLink key={c.level} href={`#high-rank-${c.level.toLowerCase()}`}>&nbsp;&nbsp;{c.level}</TocLink>
            ))}
            <div className="pt-2 pb-1">
              <span className="text-xs font-bold text-pink-400">Highest (Lv1–3)</span>
            </div>
            {HIGHEST_CARDS.map(c => (
              <TocLink key={c.level} href={`#highest-${c.level.toLowerCase()}`}>&nbsp;&nbsp;{c.level}</TocLink>
            ))}
            <TocLink href="#tips">Tips &amp; Notes</TocLink>
          </div>
        </aside>
      </div>
    </div>
  );
}
