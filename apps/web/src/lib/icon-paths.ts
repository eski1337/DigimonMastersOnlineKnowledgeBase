/**
 * Centralized icon path helpers and media URL resolution.
 *
 * These were previously copy-pasted across 5+ files.
 * Canonical source of truth for mapping display names → icon filenames.
 */

export const PUBLIC_CMS_URL = process.env.NEXT_PUBLIC_CMS_URL || 'https://cms.dmokb.info';

/** Resolve a CMS media URL to an absolute URL.
 *  Returns empty string for null/undefined, or for invalid paths (e.g. raw MongoDB ObjectIDs). */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  // Reject MongoDB ObjectIDs or other non-path strings (must start with /)
  if (!url.startsWith('/')) return '';
  return `${PUBLIC_CMS_URL}${url}`;
}

const FAMILY_FILENAME_MAP: Record<string, string> = {
  'Dark Area': 'DarkArea',
  'Deep Savers': 'DeepSavers',
  "Dragon's Roar": 'DragonsRoar',
  'Jungle Troopers': 'JungleTroopers',
  'Metal Empire': 'MetalEmpire',
  'Nature Spirits': 'NatureSpirits',
  'Nightmare Soldiers': 'NightmareSoliders', // matches actual filename on disk
  'Virus Busters': 'VirusBusters',
  'Wind Guardians': 'WindGuardians',
  'Unknown': 'Unknown',
  'TBD': 'TBD',
};

const ATTACKER_TYPE_FILENAME_MAP: Record<string, string> = {
  'Quick Attacker': 'QuickAttacker',
  'Short Attacker': 'ShortAttacker',
  'Near Attacker': 'NearAttacker',
  'Defender': 'Defender',
  'Att.typeneeded': '',
  'TBD': '',
  '': '',
};

/** Bad icon patterns that should fall back to placeholder */
const BAD_ICON_PATTERNS = [
  '/Families/',
  '/Attributes/',
  'Virus_Busters',
  'VirusBuster',
  'VB.png',
  'Alphamon_(X-Antibody_System)_Icon',
];

export const DIGIMON_PLACEHOLDER = '/icons/Placeholder/digiplaceholder.png';

/** Check if an image URL is a known bad icon that should use a placeholder */
export function shouldUsePlaceholder(url: string | null | undefined): boolean {
  if (!url) return true;
  return BAD_ICON_PATTERNS.some((p) => url.includes(p));
}

/** Resolve a Digimon image URL, returning the placeholder for bad/missing icons */
export function resolveDigimonImage(url: string | null | undefined): string {
  return shouldUsePlaceholder(url) ? DIGIMON_PLACEHOLDER : url!;
}

const ELEMENT_FILENAME_MAP: Record<string, string> = {
  'pitch black': 'Pitch_Black',
};

export function getElementIconPath(element: string): string {
  const key = element.toLowerCase();
  const fileName = ELEMENT_FILENAME_MAP[key] || element.replace(/\s+/g, '_');
  return `/icons/Elements/${fileName}.png`;
}

export function getAttributeIconPath(attribute: string): string {
  if (attribute === 'Unknown') return '/icons/Attributes/Unknown_Attribute.png';
  return `/icons/Attributes/${attribute}.png`;
}

export function getRankIconPath(rank: string): string {
  return `/icons/Ranks/${rank}.png`;
}

export function getFamilyIconPath(family: string): string {
  const fileName = FAMILY_FILENAME_MAP[family] || family.replace(/\s+/g, '').replace(/'/g, '');
  return `/icons/Families/${fileName}.png`;
}

export function getAttackerTypeIconPath(attackerType: string): string {
  const mapped = ATTACKER_TYPE_FILENAME_MAP[attackerType];
  if (mapped === '') return '/icons/Placeholder/digiplaceholder.png';
  const fileName = mapped || attackerType.replace(/\s+/g, '');
  return `/icons/AttackerType/${fileName}.png`;
}

export function getStatIconPath(stat: string): string {
  return `/icons/Stats/${stat.toUpperCase()}.png`;
}

export const STAT_ORDER: { key: string; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'at', label: 'AT' },
  { key: 'de', label: 'DE' },
  { key: 'as', label: 'AS' },
  { key: 'ds', label: 'DS' },
  { key: 'ct', label: 'CT' },
  { key: 'ht', label: 'HT' },
  { key: 'ev', label: 'EV' },
];
