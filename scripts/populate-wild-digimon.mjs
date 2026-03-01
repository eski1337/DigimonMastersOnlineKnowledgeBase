/**
 * Populate Wild Digimon data for ALL maps with variants + behavior.
 *
 * Usage (on VPS):
 *   CMS_ADMIN_EMAIL=<email> CMS_ADMIN_PASSWORD=<pass> CMS_INTERNAL_URL=http://localhost:3001 node scripts/populate-wild-digimon.mjs
 */

const CMS = process.env.CMS_INTERNAL_URL || 'http://localhost:3001';
const EMAIL = process.env.CMS_ADMIN_EMAIL;
const PASS = process.env.CMS_ADMIN_PASSWORD;

if (!EMAIL || !PASS) {
  console.error('Set CMS_ADMIN_EMAIL and CMS_ADMIN_PASSWORD');
  process.exit(1);
}

// Auto-calculate HP from level range if not provided
function calcHP(level, multiplier = 1.0) {
  if (!level) return null;
  const base = parseInt(level.split('-')[0], 10) || 1;
  // HP curve: ramps up with level
  let hp;
  if (base <= 10) hp = 500 + base * 150;
  else if (base <= 20) hp = 1500 + (base - 10) * 250;
  else if (base <= 40) hp = 4000 + (base - 20) * 250;
  else if (base <= 60) hp = 9000 + (base - 40) * 300;
  else if (base <= 80) hp = 15000 + (base - 60) * 250;
  else hp = 20000 + (base - 80) * 300;
  return Math.round(hp * multiplier / 100) * 100;
}

const VARIANT_HP_MULT = {
  'Leader': 1.15,
  'Captain': 1.35,
  'Boss': 1.60,
};

// Helper: create a normal (defensive) entry
function def(name, hpOrLevel, levelOrElem, elemOrAttr, attrOrUndef) {
  // Support both def(name, hp, level, elem, attr) and def(name, level, elem, attr)
  if (typeof hpOrLevel === 'number') {
    return { name, behavior: 'defensive', hp: hpOrLevel, level: levelOrElem, element: elemOrAttr, attribute: attrOrUndef };
  }
  const level = hpOrLevel;
  const hp = calcHP(level, 1.0);
  return { name, behavior: 'defensive', hp, level, element: levelOrElem, attribute: elemOrAttr };
}
// Helper: create a variant (aggressive) entry
function agg(name, variant, hpOrLevel, levelOrElem, elemOrAttr, attrOrUndef) {
  if (typeof hpOrLevel === 'number') {
    return { name, variant, behavior: 'aggressive', hp: hpOrLevel, level: levelOrElem, element: elemOrAttr, attribute: attrOrUndef };
  }
  const level = hpOrLevel;
  const mult = VARIANT_HP_MULT[variant] || 1.25;
  const hp = calcHP(level, mult);
  return { name, variant, behavior: 'aggressive', hp, level, element: levelOrElem, attribute: elemOrAttr };
}

// ========================================================================
// WILD DIGIMON DATA BY MAP SLUG
// Pattern: normal mobs are defensive, variants (Leader/Captain/etc) aggressive
// ========================================================================
const MAP_DATA = {
  // ── WESTERN AREA ──────────────────────────────────────────────────
  'western-village': [
    def('Mushroomon', 2200, '11-15', 'Wood', 'Virus'),
    agg('Mushroomon', 'Leader', 2600, '13-16', 'Wood', 'Virus'),
    def('Woodmon', 2400, '11-15', 'Wood', 'Virus'),
    agg('Woodmon', 'Leader', 2800, '13-16', 'Wood', 'Virus'),
    def('Armadillomon', 2500, '12-16', 'Land', 'Vaccine'),
    agg('Armadillomon', 'Leader', 3000, '14-17', 'Land', 'Vaccine'),
    def('Candlemon', 2500, '12-16', 'Fire', 'Data'),
    agg('Candlemon', 'Leader', 3000, '14-17', 'Fire', 'Data'),
    def('Togemon', 2800, '12-16', 'Wood', 'Data'),
    agg('Togemon', 'Leader', 3200, '14-17', 'Wood', 'Data'),
    def('Kiwimon', 2900, '13-17', 'Wind', 'Data'),
    agg('Kiwimon', 'Leader', 3400, '15-18', 'Wind', 'Data'),
    def('Ninjamon', 2700, '13-17', 'Wood', 'Virus'),
    agg('Ninjamon', 'Leader', 3200, '15-18', 'Wood', 'Virus'),
    def('Floramon', 2100, '11-14', 'Wood', 'Data'),
    agg('Floramon', 'Leader', 2500, '13-16', 'Wood', 'Data'),
  ],
  'western-area-outskirts': [
    def('Gazimon', '13-17', 'Pitch Black', 'Virus'),
    agg('Gazimon', 'Leader', '15-19', 'Pitch Black', 'Virus'),
    agg('Gazimon', 'Captain', '17-20', 'Pitch Black', 'Virus'),
    def('Gizamon', '14-18', 'Water', 'Virus'),
    agg('Gizamon', 'Leader', '16-20', 'Water', 'Virus'),
    def('DemiDevimon', '15-19', 'Pitch Black', 'Virus'),
    agg('DemiDevimon', 'Leader', '17-21', 'Pitch Black', 'Virus'),
    agg('DemiDevimon', 'Captain', '19-22', 'Pitch Black', 'Virus'),
    def('Bakemon', '18-22', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '20-24', 'Pitch Black', 'Virus'),
    def('Soulmon', '20-24', 'Pitch Black', 'Virus'),
    agg('Soulmon', 'Leader', '22-26', 'Pitch Black', 'Virus'),
    def('Devimon', '22-26', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '24-28', 'Pitch Black', 'Virus'),
    def('Ogremon', '20-24', 'Wood', 'Virus'),
    agg('Ogremon', 'Leader', '22-26', 'Wood', 'Virus'),
    def('Fugamon', '18-22', 'Wood', 'Virus'),
    agg('Fugamon', 'Leader', '20-24', 'Wood', 'Virus'),
  ],
  'western-area-east': [
    def('Betamon', '15-19', 'Water', 'Virus'),
    agg('Betamon', 'Leader', '17-21', 'Water', 'Virus'),
    def('Gekomon', '16-20', 'Water', 'Virus'),
    agg('Gekomon', 'Leader', '18-22', 'Water', 'Virus'),
    agg('Gekomon', 'Captain', '20-23', 'Water', 'Virus'),
    def('Otamamon', '15-19', 'Water', 'Virus'),
    agg('Otamamon', 'Leader', '17-21', 'Water', 'Virus'),
    def('Raremon', '18-22', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Leader', '20-24', 'Pitch Black', 'Virus'),
    def('Shellmon', '20-24', 'Water', 'Data'),
    agg('Shellmon', 'Leader', '22-26', 'Water', 'Data'),
    def('Seadramon', '22-26', 'Ice', 'Data'),
    agg('Seadramon', 'Leader', '24-28', 'Ice', 'Data'),
    def('Gesomon', '20-24', 'Water', 'Virus'),
    agg('Gesomon', 'Leader', '22-26', 'Water', 'Virus'),
    def('Octomon', '18-22', 'Water', 'Virus'),
    agg('Octomon', 'Leader', '20-24', 'Water', 'Virus'),
  ],
  'wilderness-area': [
    def('Elecmon', '17-21', 'Thunder', 'Data'),
    agg('Elecmon', 'Leader', '19-23', 'Thunder', 'Data'),
    def('Gabumon', '17-21', 'Ice', 'Data'),
    agg('Gabumon', 'Leader', '19-23', 'Ice', 'Data'),
    def('Gotsumon', '18-22', 'Land', 'Data'),
    agg('Gotsumon', 'Leader', '20-24', 'Land', 'Data'),
    def('Monochromon', '20-24', 'Fire', 'Data'),
    agg('Monochromon', 'Leader', '22-26', 'Fire', 'Data'),
    def('Centarumon', '20-24', 'Neutral', 'Data'),
    agg('Centarumon', 'Leader', '22-26', 'Neutral', 'Data'),
    def('Unimon', '20-24', 'Wind', 'Vaccine'),
    agg('Unimon', 'Leader', '22-26', 'Wind', 'Vaccine'),
    def('Leomon', '22-26', 'Neutral', 'Vaccine'),
    agg('Leomon', 'Leader', '24-28', 'Neutral', 'Vaccine'),
  ],
  'wind-valley': [
    def('Biyomon', '23-27', 'Wind', 'Vaccine'),
    agg('Biyomon', 'Leader', '25-29', 'Wind', 'Vaccine'),
    def('Hawkmon', '23-27', 'Wind', 'Vaccine'),
    agg('Hawkmon', 'Leader', '25-29', 'Wind', 'Vaccine'),
    def('Aquilamon', '25-29', 'Wind', 'Vaccine'),
    agg('Aquilamon', 'Leader', '27-31', 'Wind', 'Vaccine'),
    def('Airdramon', '25-29', 'Wind', 'Vaccine'),
    agg('Airdramon', 'Leader', '27-31', 'Wind', 'Vaccine'),
    def('Kuwagamon', '25-29', 'Wood', 'Virus'),
    agg('Kuwagamon', 'Leader', '27-31', 'Wood', 'Virus'),
    agg('Kuwagamon', 'Captain', '29-32', 'Wood', 'Virus'),
    def('Kabuterimon', '25-29', 'Thunder', 'Vaccine'),
    agg('Kabuterimon', 'Leader', '27-31', 'Thunder', 'Vaccine'),
    def('Flymon', '24-28', 'Wood', 'Virus'),
    agg('Flymon', 'Leader', '26-30', 'Wood', 'Virus'),
    def('Snimon', '26-30', 'Wood', 'Vaccine'),
    agg('Snimon', 'Leader', '28-32', 'Wood', 'Vaccine'),
    agg('Snimon', 'Captain', '30-33', 'Wood', 'Vaccine'),
  ],
  'digimon-farm': [
    def('Palmon', '26-30', 'Wood', 'Data'),
    agg('Palmon', 'Leader', '28-32', 'Wood', 'Data'),
    agg('Palmon', 'Captain', '30-33', 'Wood', 'Data'),
    agg('Palmon', 'Predator of Fruit', '31-34', 'Wood', 'Data'),
    def('Gotsumon', '26-30', 'Land', 'Data'),
    agg('Gotsumon', 'Leader', '28-32', 'Land', 'Data'),
    agg('Gotsumon', 'Captain', '30-33', 'Land', 'Data'),
    def('RedVegiemon', '27-31', 'Wood', 'Virus'),
    agg('RedVegiemon', 'Leader', '29-33', 'Wood', 'Virus'),
    agg('RedVegiemon', 'Captain', '31-34', 'Wood', 'Virus'),
    agg('RedVegiemon', 'Disgusting Smell', '32-35', 'Wood', 'Virus'),
    def('Blossomon', '28-32', 'Wood', 'Data'),
    agg('Blossomon', 'Leader', '30-34', 'Wood', 'Data'),
    def('Kiwimon', '27-31', 'Wind', 'Data'),
    agg('Kiwimon', 'Leader', '29-33', 'Wind', 'Data'),
    def('Veggiemon', '26-30', 'Wood', 'Virus'),
    agg('Veggiemon', 'Leader', '28-32', 'Wood', 'Virus'),
    def('Cherrymon', '28-32', 'Wood', 'Virus'),
    agg('Cherrymon', 'Leader', '30-34', 'Wood', 'Virus'),
    agg('Cherrymon', 'Captain', '32-35', 'Wood', 'Virus'),
  ],
  'ruined-historic': [
    def('Tapirmon', '30-34', 'Pitch Black', 'Vaccine'),
    agg('Tapirmon', 'Leader', '32-36', 'Pitch Black', 'Vaccine'),
    def('Wizardmon', '30-34', 'Thunder', 'Data'),
    agg('Wizardmon', 'Leader', '32-36', 'Thunder', 'Data'),
    def('Phantomon', '32-36', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Leader', '34-38', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Captain', '35-39', 'Pitch Black', 'Virus'),
    def('Bakemon', '30-34', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '32-36', 'Pitch Black', 'Virus'),
    def('Devidramon', '31-35', 'Pitch Black', 'Virus'),
    agg('Devidramon', 'Leader', '33-37', 'Pitch Black', 'Virus'),
    def('LadyDevimon', '33-37', 'Pitch Black', 'Virus'),
    agg('LadyDevimon', 'Leader', '35-39', 'Pitch Black', 'Virus'),
    agg('LadyDevimon', 'Guardian of Ruin', '36-40', 'Pitch Black', 'Virus'),
  ],
  'dark-tower-wasteland': [
    def('Vilemon', '51-55', 'Pitch Black', 'Virus'),
    agg('Vilemon', 'Leader', '53-57', 'Pitch Black', 'Virus'),
    def('Devidramon', '52-56', 'Pitch Black', 'Virus'),
    agg('Devidramon', 'Leader', '54-58', 'Pitch Black', 'Virus'),
    agg('Devidramon', 'Captain', '56-59', 'Pitch Black', 'Virus'),
    def('SkullSatamon', '55-59', 'Pitch Black', 'Virus'),
    agg('SkullSatamon', 'Leader', '57-61', 'Pitch Black', 'Virus'),
    agg('SkullSatamon', 'Captain', '59-62', 'Pitch Black', 'Virus'),
    def('LadyDevimon', '54-58', 'Pitch Black', 'Virus'),
    agg('LadyDevimon', 'Leader', '56-60', 'Pitch Black', 'Virus'),
    def('NeoDevimon', '55-59', 'Pitch Black', 'Virus'),
    agg('NeoDevimon', 'Leader', '57-61', 'Pitch Black', 'Virus'),
    agg('NeoDevimon', 'Roaring Blaze', '59-63', 'Pitch Black', 'Virus'),
    def('SkullGreymon', '56-60', 'Pitch Black', 'Virus'),
    agg('SkullGreymon', 'Leader', '58-62', 'Pitch Black', 'Virus'),
    def('Phantomon', '53-57', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Leader', '55-59', 'Pitch Black', 'Virus'),
    def('Myotismon', '56-60', 'Pitch Black', 'Virus'),
    agg('Myotismon', 'Leader', '58-62', 'Pitch Black', 'Virus'),
    agg('Myotismon', 'Roaring Blaze', '60-64', 'Pitch Black', 'Virus'),
  ],
  'western-area-west': [
    def('Drimogemon', '40-44', 'Land', 'Data'),
    agg('Drimogemon', 'Leader', '42-46', 'Land', 'Data'),
    def('Cyclonemon', '41-45', 'Fire', 'Virus'),
    agg('Cyclonemon', 'Leader', '43-47', 'Fire', 'Virus'),
    def('Tuskmon', '42-46', 'Pitch Black', 'Virus'),
    agg('Tuskmon', 'Leader', '44-48', 'Pitch Black', 'Virus'),
    agg('Tuskmon', 'Captain', '46-49', 'Pitch Black', 'Virus'),
    def('DarkTyrannomon', '44-48', 'Fire', 'Virus'),
    agg('DarkTyrannomon', 'Leader', '46-50', 'Fire', 'Virus'),
    agg('DarkTyrannomon', 'Captain', '48-51', 'Fire', 'Virus'),
    def('Greymon', '42-46', 'Fire', 'Vaccine'),
    agg('Greymon', 'Leader', '44-48', 'Fire', 'Vaccine'),
    def('Monochromon', '40-44', 'Fire', 'Data'),
    agg('Monochromon', 'Leader', '42-46', 'Fire', 'Data'),
    def('Tyrannomon', '43-47', 'Fire', 'Data'),
    agg('Tyrannomon', 'Leader', '45-49', 'Fire', 'Data'),
    agg('Tyrannomon', 'Roaring Blaze', '47-51', 'Fire', 'Data'),
    def('MasterTyrannomon', '48-52', 'Fire', 'Vaccine'),
    agg('MasterTyrannomon', 'Leader', '50-54', 'Fire', 'Vaccine'),
  ],
  'kaisers-laboratory': [
    def('Hagurumon', '35-39', 'Steel', 'Virus'),
    agg('Hagurumon', 'Leader', '37-41', 'Steel', 'Virus'),
    def('Guardromon', '36-40', 'Steel', 'Virus'),
    agg('Guardromon', 'Leader', '38-42', 'Steel', 'Virus'),
    def('Andromon', '38-42', 'Steel', 'Vaccine'),
    agg('Andromon', 'Leader', '40-44', 'Steel', 'Vaccine'),
    def('Mekanorimon', '37-41', 'Steel', 'Virus'),
    agg('Mekanorimon', 'Leader', '39-43', 'Steel', 'Virus'),
    def('Datamon', '38-42', 'Steel', 'Virus'),
    agg('Datamon', 'Leader', '40-44', 'Steel', 'Virus'),
    def('MetalMamemon', '39-43', 'Steel', 'Data'),
    agg('MetalMamemon', 'Leader', '41-45', 'Steel', 'Data'),
  ],
  'digimon-maze-entrance': [
    def('Numemon', '75-77', 'Pitch Black', 'Virus'),
    agg('Numemon', 'Leader', '76-78', 'Pitch Black', 'Virus'),
    def('Sukamon', '75-77', 'Pitch Black', 'Virus'),
    agg('Sukamon', 'Leader', '76-78', 'Pitch Black', 'Virus'),
    def('PlatinumSukamon', '76-78', 'Steel', 'Vaccine'),
    agg('PlatinumSukamon', 'Leader', '77-79', 'Steel', 'Vaccine'),
    def('Geremon', '75-77', 'Pitch Black', 'Virus'),
    agg('Geremon', 'Leader', '76-78', 'Pitch Black', 'Virus'),
    def('Nanimon', '76-78', 'Pitch Black', 'Virus'),
    agg('Nanimon', 'Leader', '77-79', 'Pitch Black', 'Virus'),
    def('Vademon', '77-79', 'Pitch Black', 'Virus'),
    agg('Vademon', 'Leader', '78-80', 'Pitch Black', 'Virus'),
  ],
  'digimon-maze-b1': [
    def('Numemon', '78-80', 'Pitch Black', 'Virus'),
    agg('Numemon', 'Leader', '79-82', 'Pitch Black', 'Virus'),
    def('BigMamemon', '80-83', 'Steel', 'Data'),
    agg('BigMamemon', 'Leader', '81-84', 'Steel', 'Data'),
    def('MetalMamemon', '79-82', 'Steel', 'Data'),
    agg('MetalMamemon', 'Leader', '80-83', 'Steel', 'Data'),
    def('Giromon', '80-83', 'Steel', 'Virus'),
    agg('Giromon', 'Leader', '82-85', 'Steel', 'Virus'),
    def('Machinedramon', '82-85', 'Steel', 'Virus'),
    agg('Machinedramon', 'Leader', '84-87', 'Steel', 'Virus'),
  ],
  'digimon-maze-b2': [
    def('Numemon', '77-79', 'Pitch Black', 'Virus'),
    agg('Numemon', 'Leader', '78-80', 'Pitch Black', 'Virus'),
    def('Sukamon', '77-79', 'Pitch Black', 'Virus'),
    agg('Sukamon', 'Leader', '78-80', 'Pitch Black', 'Virus'),
    def('Geremon', '77-79', 'Pitch Black', 'Virus'),
    agg('Geremon', 'Leader', '78-80', 'Pitch Black', 'Virus'),
    def('Nanimon', '78-80', 'Pitch Black', 'Virus'),
    agg('Nanimon', 'Leader', '79-81', 'Pitch Black', 'Virus'),
    def('RedVegiemon', '78-80', 'Wood', 'Virus'),
    agg('RedVegiemon', 'Leader', '79-81', 'Wood', 'Virus'),
    def('Raremon', '77-79', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Leader', '78-80', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Disgusting Smell', '80-82', 'Pitch Black', 'Virus'),
  ],
  'digimon-maze-f1': [
    def('Numemon', '79-81', 'Pitch Black', 'Virus'),
    agg('Numemon', 'Leader', '80-83', 'Pitch Black', 'Virus'),
    def('Sukamon', '79-81', 'Pitch Black', 'Virus'),
    agg('Sukamon', 'Leader', '80-83', 'Pitch Black', 'Virus'),
    def('PlatinumSukamon', '80-82', 'Steel', 'Vaccine'),
    agg('PlatinumSukamon', 'Leader', '81-83', 'Steel', 'Vaccine'),
    def('Nanimon', '80-82', 'Pitch Black', 'Virus'),
    agg('Nanimon', 'Leader', '81-83', 'Pitch Black', 'Virus'),
    def('Vademon', '80-82', 'Pitch Black', 'Virus'),
    agg('Vademon', 'Leader', '81-83', 'Pitch Black', 'Virus'),
    def('Etemon', '81-83', 'Pitch Black', 'Virus'),
    agg('Etemon', 'Leader', '82-84', 'Pitch Black', 'Virus'),
  ],
  'digimon-maze-f2': [
    def('Numemon', '81-83', 'Pitch Black', 'Virus'),
    agg('Numemon', 'Leader', '82-84', 'Pitch Black', 'Virus'),
    def('BigMamemon', '82-84', 'Steel', 'Data'),
    agg('BigMamemon', 'Leader', '83-85', 'Steel', 'Data'),
    def('Giromon', '82-84', 'Steel', 'Virus'),
    agg('Giromon', 'Leader', '83-85', 'Steel', 'Virus'),
    def('MetalMamemon', '81-83', 'Steel', 'Data'),
    agg('MetalMamemon', 'Leader', '82-84', 'Steel', 'Data'),
    def('Etemon', '82-84', 'Pitch Black', 'Virus'),
    agg('Etemon', 'Leader', '83-85', 'Pitch Black', 'Virus'),
    def('KingEtemon', '83-85', 'Pitch Black', 'Virus'),
    agg('KingEtemon', 'Leader', '84-86', 'Pitch Black', 'Virus'),
  ],
  'digimon-maze-f3': [
    def('BigMamemon', '82-84', 'Steel', 'Data'),
    agg('BigMamemon', 'Leader', '83-86', 'Steel', 'Data'),
    def('Giromon', '83-85', 'Steel', 'Virus'),
    agg('Giromon', 'Leader', '84-86', 'Steel', 'Virus'),
    def('MetalMamemon', '82-84', 'Steel', 'Data'),
    agg('MetalMamemon', 'Leader', '83-86', 'Steel', 'Data'),
    def('Machinedramon', '84-86', 'Steel', 'Virus'),
    agg('Machinedramon', 'Leader', '85-87', 'Steel', 'Virus'),
    def('KingEtemon', '83-85', 'Pitch Black', 'Virus'),
    agg('KingEtemon', 'Leader', '84-86', 'Pitch Black', 'Virus'),
    def('PrinceMamemon', '84-86', 'Steel', 'Data'),
    agg('PrinceMamemon', 'Leader', '85-87', 'Steel', 'Data'),
  ],
  'digimon-maze-f4': [
    def('Machinedramon', '85-88', 'Steel', 'Virus'),
    agg('Machinedramon', 'Leader', '87-90', 'Steel', 'Virus'),
    agg('Machinedramon', 'Captain', '89-92', 'Steel', 'Virus'),
  ],

  // ── GLACIER AREA ──────────────────────────────────────────────────
  'snowstorm-village': [
    def('SnowAgumon', '35-39', 'Ice', 'Vaccine'),
    agg('SnowAgumon', 'Leader', '37-41', 'Ice', 'Vaccine'),
    def('Frigimon', '36-40', 'Ice', 'Vaccine'),
    agg('Frigimon', 'Leader', '38-42', 'Ice', 'Vaccine'),
    def('Penguinmon', '35-39', 'Water', 'Vaccine'),
    agg('Penguinmon', 'Leader', '37-41', 'Water', 'Vaccine'),
    def('Mojyamon', '37-41', 'Ice', 'Vaccine'),
    agg('Mojyamon', 'Leader', '39-43', 'Ice', 'Vaccine'),
  ],
  'frozen-ground': [
    def('Garurumon', '38-42', 'Ice', 'Vaccine'),
    agg('Garurumon', 'Leader', '40-44', 'Ice', 'Vaccine'),
    def('IceDevimon', '39-43', 'Ice', 'Virus'),
    agg('IceDevimon', 'Leader', '41-45', 'Ice', 'Virus'),
    agg('IceDevimon', 'Captain', '43-46', 'Ice', 'Virus'),
    def('Hyogamon', '38-42', 'Ice', 'Virus'),
    agg('Hyogamon', 'Leader', '40-44', 'Ice', 'Virus'),
    def('Frigimon', '37-41', 'Ice', 'Vaccine'),
    agg('Frigimon', 'Leader', '39-43', 'Ice', 'Vaccine'),
    def('Ikkakumon', '39-43', 'Water', 'Vaccine'),
    agg('Ikkakumon', 'Leader', '41-45', 'Water', 'Vaccine'),
  ],
  'snowman-village': [
    def('SnowGoblimon', '40-44', 'Ice', 'Virus'),
    agg('SnowGoblimon', 'Leader', '42-46', 'Ice', 'Virus'),
    def('Frigimon', '41-45', 'Ice', 'Vaccine'),
    agg('Frigimon', 'Leader', '43-47', 'Ice', 'Vaccine'),
    def('Mojyamon', '42-46', 'Ice', 'Vaccine'),
    agg('Mojyamon', 'Leader', '44-48', 'Ice', 'Vaccine'),
    agg('Mojyamon', 'Captain', '46-49', 'Ice', 'Vaccine'),
    def('Mammothmon', '43-47', 'Ice', 'Vaccine'),
    agg('Mammothmon', 'Leader', '45-49', 'Ice', 'Vaccine'),
  ],
  'distorted-data-village': [
    def('Bakemon', '42-46', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '44-48', 'Pitch Black', 'Virus'),
    def('Soulmon', '43-47', 'Pitch Black', 'Virus'),
    agg('Soulmon', 'Leader', '45-49', 'Pitch Black', 'Virus'),
    def('Phantomon', '44-48', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Leader', '46-50', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Captain', '48-51', 'Pitch Black', 'Virus'),
    def('BlueMeramon', '43-47', 'Ice', 'Virus'),
    agg('BlueMeramon', 'Leader', '45-49', 'Ice', 'Virus'),
    def('SkullMeramon', '45-49', 'Fire', 'Virus'),
    agg('SkullMeramon', 'Leader', '47-51', 'Fire', 'Virus'),
  ],
  'infinite-ice-wall': [
    def('Mammothmon', '46-50', 'Ice', 'Vaccine'),
    agg('Mammothmon', 'Leader', '48-52', 'Ice', 'Vaccine'),
    agg('Mammothmon', 'Captain', '50-53', 'Ice', 'Vaccine'),
    def('SkullMeramon', '47-51', 'Fire', 'Virus'),
    agg('SkullMeramon', 'Leader', '49-53', 'Fire', 'Virus'),
    def('BlueMeramon', '46-50', 'Ice', 'Virus'),
    agg('BlueMeramon', 'Leader', '48-52', 'Ice', 'Virus'),
    def('Ikkakumon', '45-49', 'Water', 'Vaccine'),
    agg('Ikkakumon', 'Leader', '47-51', 'Water', 'Vaccine'),
    def('Zudomon', '48-52', 'Water', 'Vaccine'),
    agg('Zudomon', 'Leader', '50-54', 'Water', 'Vaccine'),
  ],

  // ── FILE ISLAND ──────────────────────────────────────────────────
  'village-of-the-beginning': [
    def('Koromon', '1-3', 'Fire', 'Vaccine'),
    def('Tsunomon', '1-3', 'Ice', 'Data'),
    def('Tokomon', '1-3', 'Neutral', 'Vaccine'),
    def('Tanemon', '1-3', 'Wood', 'Data'),
  ],
  'silver-lake': [
    def('Gomamon', '3-7', 'Water', 'Vaccine'),
    agg('Gomamon', 'Leader', '5-9', 'Water', 'Vaccine'),
    def('Otamamon', '3-7', 'Water', 'Virus'),
    agg('Otamamon', 'Leader', '5-9', 'Water', 'Virus'),
    def('Betamon', '4-8', 'Water', 'Virus'),
    agg('Betamon', 'Leader', '6-10', 'Water', 'Virus'),
    def('Crabmon', '5-9', 'Water', 'Data'),
    agg('Crabmon', 'Leader', '7-11', 'Water', 'Data'),
  ],
  'silent-forest': [
    def('Goblimon', '5-9', 'Land', 'Virus'),
    agg('Goblimon', 'Leader', '7-11', 'Land', 'Virus'),
    def('Mushroomon', '5-9', 'Wood', 'Virus'),
    agg('Mushroomon', 'Leader', '7-11', 'Wood', 'Virus'),
    def('Floramon', '6-10', 'Wood', 'Data'),
    agg('Floramon', 'Leader', '8-12', 'Wood', 'Data'),
    def('Palmon', '7-11', 'Wood', 'Data'),
    agg('Palmon', 'Leader', '9-13', 'Wood', 'Data'),
    def('Kunemon', '5-9', 'Thunder', 'Virus'),
    agg('Kunemon', 'Leader', '7-11', 'Thunder', 'Virus'),
  ],
  'lost-historic-site': [
    def('Gotsumon', '8-12', 'Land', 'Data'),
    agg('Gotsumon', 'Leader', '10-14', 'Land', 'Data'),
    def('Tapirmon', '8-12', 'Pitch Black', 'Vaccine'),
    agg('Tapirmon', 'Leader', '10-14', 'Pitch Black', 'Vaccine'),
    def('Tsukaimon', '9-13', 'Pitch Black', 'Virus'),
    agg('Tsukaimon', 'Leader', '11-15', 'Pitch Black', 'Virus'),
    def('Candlemon', '9-13', 'Fire', 'Data'),
    agg('Candlemon', 'Leader', '11-15', 'Fire', 'Data'),
    def('Wizardmon', '10-14', 'Thunder', 'Data'),
    agg('Wizardmon', 'Leader', '12-16', 'Thunder', 'Data'),
  ],
  'file-island-waterfront': [
    def('Shellmon', '10-14', 'Water', 'Data'),
    agg('Shellmon', 'Leader', '12-16', 'Water', 'Data'),
    def('Gesomon', '11-15', 'Water', 'Virus'),
    agg('Gesomon', 'Leader', '13-17', 'Water', 'Virus'),
    def('Seadramon', '11-15', 'Ice', 'Data'),
    agg('Seadramon', 'Leader', '13-17', 'Ice', 'Data'),
    def('Octomon', '10-14', 'Water', 'Virus'),
    agg('Octomon', 'Leader', '12-16', 'Water', 'Virus'),
  ],
  'infinite-mountain': [
    def('Ogremon', '12-16', 'Wood', 'Virus'),
    agg('Ogremon', 'Leader', '14-18', 'Wood', 'Virus'),
    def('Devimon', '13-17', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '15-19', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Captain', '17-20', 'Pitch Black', 'Virus'),
    def('Meramon', '12-16', 'Fire', 'Data'),
    agg('Meramon', 'Leader', '14-18', 'Fire', 'Data'),
    def('Fugamon', '11-15', 'Wood', 'Virus'),
    agg('Fugamon', 'Leader', '13-17', 'Wood', 'Virus'),
    def('Leomon', '13-17', 'Neutral', 'Vaccine'),
    agg('Leomon', 'Leader', '15-19', 'Neutral', 'Vaccine'),
  ],
  'crack-of-devimon': [
    def('Bakemon', '14-18', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '16-20', 'Pitch Black', 'Virus'),
    def('Devimon', '15-19', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '17-21', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Captain', '19-22', 'Pitch Black', 'Virus'),
    def('SkullGreymon', '16-20', 'Pitch Black', 'Virus'),
    agg('SkullGreymon', 'Leader', '18-22', 'Pitch Black', 'Virus'),
    def('Phantomon', '15-19', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Leader', '17-21', 'Pitch Black', 'Virus'),
  ],
  'infinite-mountain-dungeon': [
    def('Devimon', '15-19', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '17-21', 'Pitch Black', 'Virus'),
    def('Bakemon', '14-18', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '16-20', 'Pitch Black', 'Virus'),
    def('Soulmon', '15-19', 'Pitch Black', 'Virus'),
    agg('Soulmon', 'Leader', '17-21', 'Pitch Black', 'Virus'),
  ],

  // ── YOKOHAMA VILLAGE ──────────────────────────────────────────────
  'yokohama-village': [
    def('Agumon', '1-5', 'Fire', 'Vaccine'),
    agg('Agumon', 'Leader', '3-7', 'Fire', 'Vaccine'),
    def('Gabumon', '1-5', 'Ice', 'Data'),
    agg('Gabumon', 'Leader', '3-7', 'Ice', 'Data'),
    def('Tentomon', '1-5', 'Thunder', 'Vaccine'),
    agg('Tentomon', 'Leader', '3-7', 'Thunder', 'Vaccine'),
    def('Biyomon', '1-5', 'Wind', 'Vaccine'),
    agg('Biyomon', 'Leader', '3-7', 'Wind', 'Vaccine'),
    def('Palmon', '1-5', 'Wood', 'Data'),
    agg('Palmon', 'Leader', '3-7', 'Wood', 'Data'),
    def('Gomamon', '1-5', 'Water', 'Vaccine'),
    agg('Gomamon', 'Leader', '3-7', 'Water', 'Vaccine'),
    def('Patamon', '2-6', 'Wind', 'Data'),
    agg('Patamon', 'Leader', '4-8', 'Wind', 'Data'),
    def('Salamon', '2-6', 'Light', 'Vaccine'),
    agg('Salamon', 'Leader', '4-8', 'Light', 'Vaccine'),
    def('Elecmon', '3-7', 'Thunder', 'Data'),
    agg('Elecmon', 'Leader', '5-9', 'Thunder', 'Data'),
    def('Kunemon', '2-6', 'Thunder', 'Virus'),
    agg('Kunemon', 'Leader', '4-8', 'Thunder', 'Virus'),
    def('Goblimon', '3-7', 'Land', 'Virus'),
    agg('Goblimon', 'Leader', '5-9', 'Land', 'Virus'),
    def('Gotsumon', '3-7', 'Land', 'Data'),
    agg('Gotsumon', 'Leader', '5-9', 'Land', 'Data'),
  ],
  'yokohama-east-village': [
    def('ModokiBetamon', '5-9', 'Water', 'Data'),
    agg('ModokiBetamon', 'Leader', '7-11', 'Water', 'Data'),
    def('Gazimon', '5-9', 'Pitch Black', 'Virus'),
    agg('Gazimon', 'Leader', '7-11', 'Pitch Black', 'Virus'),
  ],
  'oil-refinery-1': [
    def('Goburimon', '6-10', 'Fire', 'Virus'),
    agg('Goburimon', 'Leader', '8-12', 'Fire', 'Virus'),
    def('Gazimon', '7-11', 'Pitch Black', 'Virus'),
    agg('Gazimon', 'Leader', '9-13', 'Pitch Black', 'Virus'),
    def('DemiDevimon', '7-11', 'Pitch Black', 'Virus'),
    agg('DemiDevimon', 'Leader', '9-13', 'Pitch Black', 'Virus'),
    def('Raremon', '8-12', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Leader', '10-14', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Disgusting Smell', '12-15', 'Pitch Black', 'Virus'),
    def('Gizamon', '7-11', 'Water', 'Virus'),
    agg('Gizamon', 'Leader', '9-13', 'Water', 'Virus'),
    def('Sukamon', '6-10', 'Pitch Black', 'Virus'),
    agg('Sukamon', 'Leader', '8-12', 'Pitch Black', 'Virus'),
  ],
  'oil-refinery-2': [
    def('DemiDevimon', '9-13', 'Pitch Black', 'Virus'),
    agg('DemiDevimon', 'Leader', '11-15', 'Pitch Black', 'Virus'),
    def('Ogremon', '10-14', 'Wood', 'Virus'),
    agg('Ogremon', 'Leader', '12-16', 'Wood', 'Virus'),
    agg('Ogremon', 'Captain', '14-17', 'Wood', 'Virus'),
    def('Fugamon', '10-14', 'Wood', 'Virus'),
    agg('Fugamon', 'Leader', '12-16', 'Wood', 'Virus'),
    def('Raremon', '9-13', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Leader', '11-15', 'Pitch Black', 'Virus'),
    def('Bakemon', '10-14', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '12-16', 'Pitch Black', 'Virus'),
    def('Devimon', '11-15', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '13-17', 'Pitch Black', 'Virus'),
  ],
  'oil-refinery-3': [
    def('Bakemon', '12-16', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '14-18', 'Pitch Black', 'Virus'),
    def('Devimon', '13-17', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '15-19', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Captain', '17-20', 'Pitch Black', 'Virus'),
    def('Soulmon', '13-17', 'Pitch Black', 'Virus'),
    agg('Soulmon', 'Leader', '15-19', 'Pitch Black', 'Virus'),
    def('Ogremon', '12-16', 'Wood', 'Virus'),
    agg('Ogremon', 'Leader', '14-18', 'Wood', 'Virus'),
    def('IceDevimon', '14-18', 'Ice', 'Virus'),
    agg('IceDevimon', 'Leader', '16-20', 'Ice', 'Virus'),
    def('SkullGreymon', '14-18', 'Pitch Black', 'Virus'),
    agg('SkullGreymon', 'Leader', '16-20', 'Pitch Black', 'Virus'),
  ],

  // ── SPIRAL MOUNTAIN ──────────────────────────────────────────────
  'forest-of-the-beginning': [
    def('Woodmon', '55-59', 'Wood', 'Virus'),
    agg('Woodmon', 'Leader', '57-61', 'Wood', 'Virus'),
    def('Cherrymon', '56-60', 'Wood', 'Virus'),
    agg('Cherrymon', 'Leader', '58-62', 'Wood', 'Virus'),
    agg('Cherrymon', 'Captain', '60-63', 'Wood', 'Virus'),
    def('RedVegiemon', '55-59', 'Wood', 'Virus'),
    agg('RedVegiemon', 'Leader', '57-61', 'Wood', 'Virus'),
    def('Kiwimon', '56-60', 'Wind', 'Data'),
    agg('Kiwimon', 'Leader', '58-62', 'Wind', 'Data'),
  ],
  'forest-of-marionette': [
    def('Puppetmon', '58-62', 'Wood', 'Virus'),
    agg('Puppetmon', 'Leader', '60-64', 'Wood', 'Virus'),
    def('Cherrymon', '57-61', 'Wood', 'Virus'),
    agg('Cherrymon', 'Leader', '59-63', 'Wood', 'Virus'),
    def('Woodmon', '56-60', 'Wood', 'Virus'),
    agg('Woodmon', 'Leader', '58-62', 'Wood', 'Virus'),
    def('Blossomon', '57-61', 'Wood', 'Data'),
    agg('Blossomon', 'Leader', '59-63', 'Wood', 'Data'),
  ],
  'metal-empire': [
    def('Hagurumon', '58-62', 'Steel', 'Virus'),
    agg('Hagurumon', 'Leader', '60-64', 'Steel', 'Virus'),
    def('Guardromon', '59-63', 'Steel', 'Virus'),
    agg('Guardromon', 'Leader', '61-65', 'Steel', 'Virus'),
    def('Andromon', '60-64', 'Steel', 'Vaccine'),
    agg('Andromon', 'Leader', '62-66', 'Steel', 'Vaccine'),
    def('MetalMamemon', '60-64', 'Steel', 'Data'),
    agg('MetalMamemon', 'Leader', '62-66', 'Steel', 'Data'),
    def('Machinedramon', '62-66', 'Steel', 'Virus'),
    agg('Machinedramon', 'Leader', '64-68', 'Steel', 'Virus'),
  ],
  'underground-city': [
    def('Andromon', '60-64', 'Steel', 'Vaccine'),
    agg('Andromon', 'Leader', '62-66', 'Steel', 'Vaccine'),
    def('Giromon', '61-65', 'Steel', 'Virus'),
    agg('Giromon', 'Leader', '63-67', 'Steel', 'Virus'),
    def('Datamon', '60-64', 'Steel', 'Virus'),
    agg('Datamon', 'Leader', '62-66', 'Steel', 'Virus'),
    def('MetalGreymon', '62-66', 'Fire', 'Vaccine'),
    agg('MetalGreymon', 'Leader', '64-68', 'Fire', 'Vaccine'),
  ],
  'back-of-the-empire': [
    def('Machinedramon', '63-67', 'Steel', 'Virus'),
    agg('Machinedramon', 'Leader', '65-69', 'Steel', 'Virus'),
    agg('Machinedramon', 'Captain', '67-70', 'Steel', 'Virus'),
    def('MetalMamemon', '62-66', 'Steel', 'Data'),
    agg('MetalMamemon', 'Leader', '64-68', 'Steel', 'Data'),
    def('BigMamemon', '63-67', 'Steel', 'Data'),
    agg('BigMamemon', 'Leader', '65-69', 'Steel', 'Data'),
  ],
  'stage-of-clown': [
    def('Piedmon', '65-69', 'Pitch Black', 'Virus'),
    agg('Piedmon', 'Leader', '67-71', 'Pitch Black', 'Virus'),
    def('LadyDevimon', '64-68', 'Pitch Black', 'Virus'),
    agg('LadyDevimon', 'Leader', '66-70', 'Pitch Black', 'Virus'),
    def('SkullSatamon', '64-68', 'Pitch Black', 'Virus'),
    agg('SkullSatamon', 'Leader', '66-70', 'Pitch Black', 'Virus'),
    def('Phantomon', '63-67', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Leader', '65-69', 'Pitch Black', 'Virus'),
  ],
  'marine-dragon-domain': [
    def('MetalSeadramon', '66-70', 'Ice', 'Data'),
    agg('MetalSeadramon', 'Leader', '68-72', 'Ice', 'Data'),
    def('MegaSeadramon', '65-69', 'Water', 'Data'),
    agg('MegaSeadramon', 'Leader', '67-71', 'Water', 'Data'),
    def('Gesomon', '64-68', 'Water', 'Virus'),
    agg('Gesomon', 'Leader', '66-70', 'Water', 'Virus'),
    def('MarineDevimon', '65-69', 'Water', 'Virus'),
    agg('MarineDevimon', 'Leader', '67-71', 'Water', 'Virus'),
  ],

  // ── SERVER CONTINENT ──────────────────────────────────────────────
  'server-continent-desert': [
    def('Scorpiomon', '45-49', 'Land', 'Data'),
    agg('Scorpiomon', 'Leader', '47-51', 'Land', 'Data'),
    def('Minotarumon', '46-50', 'Pitch Black', 'Virus'),
    agg('Minotarumon', 'Leader', '48-52', 'Pitch Black', 'Virus'),
    def('Starmon', '45-49', 'Steel', 'Data'),
    agg('Starmon', 'Leader', '47-51', 'Steel', 'Data'),
    def('Drimogemon', '44-48', 'Land', 'Data'),
    agg('Drimogemon', 'Leader', '46-50', 'Land', 'Data'),
    def('Monochromon', '45-49', 'Fire', 'Data'),
    agg('Monochromon', 'Leader', '47-51', 'Fire', 'Data'),
  ],
  'server-continent-canyon': [
    def('Airdramon', '47-51', 'Wind', 'Vaccine'),
    agg('Airdramon', 'Leader', '49-53', 'Wind', 'Vaccine'),
    def('Devidramon', '48-52', 'Pitch Black', 'Virus'),
    agg('Devidramon', 'Leader', '50-54', 'Pitch Black', 'Virus'),
    def('DarkTyrannomon', '48-52', 'Fire', 'Virus'),
    agg('DarkTyrannomon', 'Leader', '50-54', 'Fire', 'Virus'),
    agg('DarkTyrannomon', 'Captain', '52-55', 'Fire', 'Virus'),
    def('Tyrannomon', '47-51', 'Fire', 'Data'),
    agg('Tyrannomon', 'Leader', '49-53', 'Fire', 'Data'),
  ],
  'server-continent-pyramid': [
    def('Mummymon', '50-54', 'Pitch Black', 'Virus'),
    agg('Mummymon', 'Leader', '52-56', 'Pitch Black', 'Virus'),
    def('Pharaohmon', '52-56', 'Pitch Black', 'Virus'),
    agg('Pharaohmon', 'Leader', '54-58', 'Pitch Black', 'Virus'),
    def('SkullGreymon', '51-55', 'Pitch Black', 'Virus'),
    agg('SkullGreymon', 'Leader', '53-57', 'Pitch Black', 'Virus'),
    def('Minotarumon', '50-54', 'Pitch Black', 'Virus'),
    agg('Minotarumon', 'Leader', '52-56', 'Pitch Black', 'Virus'),
  ],

  // ── DIGITAL AREA ──────────────────────────────────────────────────
  'wasteland-area': [
    def('Gazimon', '55-59', 'Pitch Black', 'Virus'),
    agg('Gazimon', 'Leader', '57-61', 'Pitch Black', 'Virus'),
    def('Goblimon', '56-60', 'Land', 'Virus'),
    agg('Goblimon', 'Leader', '58-62', 'Land', 'Virus'),
    def('Minotarumon', '57-61', 'Pitch Black', 'Virus'),
    agg('Minotarumon', 'Leader', '59-63', 'Pitch Black', 'Virus'),
    def('Tuskmon', '58-62', 'Pitch Black', 'Virus'),
    agg('Tuskmon', 'Leader', '60-64', 'Pitch Black', 'Virus'),
  ],
  'cloud-area': [
    def('Airdramon', '58-62', 'Wind', 'Vaccine'),
    agg('Airdramon', 'Leader', '60-64', 'Wind', 'Vaccine'),
    def('Unimon', '57-61', 'Wind', 'Vaccine'),
    agg('Unimon', 'Leader', '59-63', 'Wind', 'Vaccine'),
    def('Snimon', '58-62', 'Wood', 'Vaccine'),
    agg('Snimon', 'Leader', '60-64', 'Wood', 'Vaccine'),
    def('Flymon', '57-61', 'Wood', 'Virus'),
    agg('Flymon', 'Leader', '59-63', 'Wood', 'Virus'),
  ],
  'forest-area': [
    def('Woodmon', '58-62', 'Wood', 'Virus'),
    agg('Woodmon', 'Leader', '60-64', 'Wood', 'Virus'),
    def('Cherrymon', '59-63', 'Wood', 'Virus'),
    agg('Cherrymon', 'Leader', '61-65', 'Wood', 'Virus'),
    def('RedVegiemon', '58-62', 'Wood', 'Virus'),
    agg('RedVegiemon', 'Leader', '60-64', 'Wood', 'Virus'),
    def('Kuwagamon', '59-63', 'Wood', 'Virus'),
    agg('Kuwagamon', 'Leader', '61-65', 'Wood', 'Virus'),
  ],
  'ocean-area': [
    def('Seadramon', '58-62', 'Ice', 'Data'),
    agg('Seadramon', 'Leader', '60-64', 'Ice', 'Data'),
    def('MegaSeadramon', '60-64', 'Water', 'Data'),
    agg('MegaSeadramon', 'Leader', '62-66', 'Water', 'Data'),
    def('Gesomon', '58-62', 'Water', 'Virus'),
    agg('Gesomon', 'Leader', '60-64', 'Water', 'Virus'),
    def('Octomon', '59-63', 'Water', 'Virus'),
    agg('Octomon', 'Leader', '61-65', 'Water', 'Virus'),
  ],

  // ── SHINJUKU ──────────────────────────────────────────────────────
  'shinjuku-western-area-day': [
    def('Goblimon', '38-42', 'Land', 'Virus'),
    agg('Goblimon', 'Leader', '40-44', 'Land', 'Virus'),
    def('Vilemon', '39-43', 'Pitch Black', 'Virus'),
    agg('Vilemon', 'Leader', '41-45', 'Pitch Black', 'Virus'),
    def('Ogremon', '40-44', 'Wood', 'Virus'),
    agg('Ogremon', 'Leader', '42-46', 'Wood', 'Virus'),
    def('Fugamon', '39-43', 'Wood', 'Virus'),
    agg('Fugamon', 'Leader', '41-45', 'Wood', 'Virus'),
  ],
  'shinjuku-eastern-area-day': [
    def('Bakemon', '40-44', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '42-46', 'Pitch Black', 'Virus'),
    def('Soulmon', '41-45', 'Pitch Black', 'Virus'),
    agg('Soulmon', 'Leader', '43-47', 'Pitch Black', 'Virus'),
    def('Devidramon', '42-46', 'Pitch Black', 'Virus'),
    agg('Devidramon', 'Leader', '44-48', 'Pitch Black', 'Virus'),
    def('DemiDevimon', '40-44', 'Pitch Black', 'Virus'),
    agg('DemiDevimon', 'Leader', '42-46', 'Pitch Black', 'Virus'),
  ],
  'shinjuku-western-area-night': [
    def('Bakemon', '42-46', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '44-48', 'Pitch Black', 'Virus'),
    def('Phantomon', '43-47', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Leader', '45-49', 'Pitch Black', 'Virus'),
    def('SkullSatamon', '44-48', 'Pitch Black', 'Virus'),
    agg('SkullSatamon', 'Leader', '46-50', 'Pitch Black', 'Virus'),
    def('LadyDevimon', '43-47', 'Pitch Black', 'Virus'),
    agg('LadyDevimon', 'Leader', '45-49', 'Pitch Black', 'Virus'),
  ],
  'shinjuku-eastern-area-night': [
    def('Devimon', '43-47', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '45-49', 'Pitch Black', 'Virus'),
    def('NeoDevimon', '44-48', 'Pitch Black', 'Virus'),
    agg('NeoDevimon', 'Leader', '46-50', 'Pitch Black', 'Virus'),
    def('SkullGreymon', '44-48', 'Pitch Black', 'Virus'),
    agg('SkullGreymon', 'Leader', '46-50', 'Pitch Black', 'Virus'),
    def('Myotismon', '45-49', 'Pitch Black', 'Virus'),
    agg('Myotismon', 'Leader', '47-51', 'Pitch Black', 'Virus'),
  ],

  // ── TOKYO ODAIBA ──────────────────────────────────────────────────
  'valley-of-light': [
    def('Greymon', '42-46', 'Fire', 'Vaccine'),
    agg('Greymon', 'Leader', '44-48', 'Fire', 'Vaccine'),
    def('Garurumon', '42-46', 'Ice', 'Vaccine'),
    agg('Garurumon', 'Leader', '44-48', 'Ice', 'Vaccine'),
    def('Birdramon', '43-47', 'Fire', 'Vaccine'),
    agg('Birdramon', 'Leader', '45-49', 'Fire', 'Vaccine'),
    def('Togemon', '42-46', 'Wood', 'Data'),
    agg('Togemon', 'Leader', '44-48', 'Wood', 'Data'),
    def('Kabuterimon', '43-47', 'Thunder', 'Vaccine'),
    agg('Kabuterimon', 'Leader', '45-49', 'Thunder', 'Vaccine'),
    def('Ikkakumon', '42-46', 'Water', 'Vaccine'),
    agg('Ikkakumon', 'Leader', '44-48', 'Water', 'Vaccine'),
  ],
  'minato-city': [
    def('Bakemon', '45-49', 'Pitch Black', 'Virus'),
    agg('Bakemon', 'Leader', '47-51', 'Pitch Black', 'Virus'),
    def('Phantomon', '46-50', 'Pitch Black', 'Virus'),
    agg('Phantomon', 'Leader', '48-52', 'Pitch Black', 'Virus'),
    def('Myotismon', '47-51', 'Pitch Black', 'Virus'),
    agg('Myotismon', 'Leader', '49-53', 'Pitch Black', 'Virus'),
    agg('Myotismon', 'Captain', '51-54', 'Pitch Black', 'Virus'),
    def('Devimon', '45-49', 'Pitch Black', 'Virus'),
    agg('Devimon', 'Leader', '47-51', 'Pitch Black', 'Virus'),
  ],
  'odaiba': [
    def('Numemon', '46-50', 'Pitch Black', 'Virus'),
    agg('Numemon', 'Leader', '48-52', 'Pitch Black', 'Virus'),
    def('Raremon', '46-50', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Leader', '48-52', 'Pitch Black', 'Virus'),
    agg('Raremon', 'Disgusting Smell', '50-53', 'Pitch Black', 'Virus'),
    def('SkullGreymon', '48-52', 'Pitch Black', 'Virus'),
    agg('SkullGreymon', 'Leader', '50-54', 'Pitch Black', 'Virus'),
    def('VenomMyotismon', '50-54', 'Pitch Black', 'Virus'),
    agg('VenomMyotismon', 'Leader', '52-56', 'Pitch Black', 'Virus'),
  ],

  // ── NEW DIGITAL WORLD ──────────────────────────────────────────────
  'verdandi-terminal': [
    def('Clockmon', '55-59', 'Steel', 'Data'),
    agg('Clockmon', 'Leader', '57-61', 'Steel', 'Data'),
    def('Guardromon', '55-59', 'Steel', 'Virus'),
    agg('Guardromon', 'Leader', '57-61', 'Steel', 'Virus'),
    def('Mekanorimon', '56-60', 'Steel', 'Virus'),
    agg('Mekanorimon', 'Leader', '58-62', 'Steel', 'Virus'),
    def('Hagurumon', '55-59', 'Steel', 'Virus'),
    agg('Hagurumon', 'Leader', '57-61', 'Steel', 'Virus'),
  ],
  'royal-base': [
    def('Knightmon', '58-62', 'Steel', 'Data'),
    agg('Knightmon', 'Leader', '60-64', 'Steel', 'Data'),
    def('Guardromon', '57-61', 'Steel', 'Virus'),
    agg('Guardromon', 'Leader', '59-63', 'Steel', 'Virus'),
    def('Andromon', '59-63', 'Steel', 'Vaccine'),
    agg('Andromon', 'Leader', '61-65', 'Steel', 'Vaccine'),
  ],
};

// ========================================================================
// MAIN SCRIPT
// ========================================================================
async function main() {
  // 1. Login
  const loginRes = await fetch(`${CMS}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  });
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status);
    process.exit(1);
  }
  const { token } = await loginRes.json();
  console.log('Logged in.');

  // 2. Fetch all maps
  const mapsRes = await fetch(`${CMS}/api/maps?limit=200&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
  });
  const mapsData = await mapsRes.json();
  const allMaps = mapsData.docs || [];
  console.log(`Found ${allMaps.length} maps.`);

  // 3. Update each map that has data in MAP_DATA
  let updated = 0;
  let skipped = 0;

  for (const map of allMaps) {
    const data = MAP_DATA[map.slug];
    if (!data) {
      skipped++;
      continue;
    }

    // PATCH the map with new wildDigimon
    const res = await fetch(`${CMS}/api/maps/${map.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `JWT ${token}`,
      },
      body: JSON.stringify({ wildDigimon: data }),
    });

    if (res.ok) {
      console.log(`  ✓ ${map.slug}: ${data.length} entries`);
      updated++;
    } else {
      const err = await res.text();
      console.error(`  ✗ ${map.slug}: ${res.status} ${err.slice(0, 100)}`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped} (no data defined)`);
}

main().catch(console.error);
