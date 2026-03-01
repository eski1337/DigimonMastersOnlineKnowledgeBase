/**
 * Type definitions for the wiki scraper system.
 * All scraper-related interfaces and types live here.
 */

// ── Parsed Digimon Preview ──────────────────────────────────────────────────

export interface DigimonStats {
  hp: number;
  at: number;
  de: number;
  as: number;
  ds: number;
  ct: number;
  ht: number;
  ev: number;
}

export interface StatsNote {
  text: string;
  size: string;
  level: number;
}

export interface DigimonSkill {
  name: string;
  type: string;
  element?: string;
  cooldown?: number;
  dsConsumption?: number;
  animationTime?: number;
  description?: string;
  skillPointsPerUpgrade?: number | null;
  imageId?: string;
  damagePerLevel?: { level: number; damage: number }[];
  icon?: string | null;
  iconUrl?: string;
  iconSourceUrl?: string;
}

export interface DigivolutionEntry {
  name: string;
  requiredLevel?: number | null;
  requiredItem?: string | null;
}

export interface DigimonNames {
  japanese: string;
  katakana: string;
  korean: string;
  chinese: string;
  thai: string;
}

export interface DigimonOverview {
  pros: string[];
  cons: string[];
}

export interface DigimonPreview {
  name: string;
  slug: string;
  form: string;
  element: string;
  attribute: string;
  type: string | null;
  attackerType: string | null;
  families: string[];
  names: DigimonNames;
  rank: string | null;
  defaultLevel: number | null;
  unlockItems: string[];
  unlockRequirements: any;
  introduction: string | null;
  icon: string | null;
  mainImage: string | null;
  stats: DigimonStats;
  maxStats: DigimonStats;
  statsNote: StatsNote | null;
  skills: DigimonSkill[];
  digivolutions: {
    digivolvesFrom: DigivolutionEntry[];
    digivolvesTo: DigivolutionEntry[];
  };
  deckBuffs: string[];
  rideable: string | null;
  isRiding: boolean;
  canBeRidden: boolean;
  canBeHatched: boolean;
  available: boolean;
  availableFromEgg: boolean;
  location: string | null;
  availableInGDMO: boolean | null;
  jogressFrom: string[] | null;
  jogressRequirement: string | null;
  unlockedAtLevel: number | null;
  unlockedWithItem: string | null;
  requiredToEvolve: string | null;
  specialEffects: any;
  uRankPassives: any;
  sssPassives: any;
  overview: DigimonOverview;
  published: boolean;
  iconUrl?: string;
  mainImageUrl?: string;
  iconSourceUrl?: string;
  mainImageSourceUrl?: string;
}

// ── Validation ──────────────────────────────────────────────────────────────

export interface ValidationSummary {
  complete: string[];
  partial: string[];
  missing: string[];
}

// ── Image Service ───────────────────────────────────────────────────────────

export interface ImageMetadata {
  imageType: string;
  belongsTo?: { digimon?: string; skill?: string; item?: string };
  tags?: string[];
}

// ── Import Results ──────────────────────────────────────────────────────────

export interface ImportResult {
  success: boolean;
  preview?: DigimonPreview;
  validation?: ValidationSummary;
  error?: string;
}

export interface SaveResult {
  success: boolean;
  digimon?: any;
  isUpdate?: boolean;
  error?: string;
  details?: any;
}

export interface BatchProgress {
  status: 'idle' | 'fetching' | 'checking' | 'importing' | 'retrying';
  message?: string;
  current?: number | null;
  currentDigimon?: string;
  total?: number;
  totalFound?: number;
  imported?: number;
  skipped?: number;
  failed?: number;
}

export interface BatchImportResult {
  totalFound: number;
  imported: number;
  skipped: number;
  failed: number;
  importedList: string[];
  failedList: { name: string; error: string }[];
}

// ── Digivolution Tree ───────────────────────────────────────────────────────

export interface TreeNode {
  id: string;
  name: string;
  icon: string;
  form: string;
  slug: string;
}

export interface TreeEdge {
  source: string;
  target: string;
  level: number | null;
  item: string | null;
}

// ── Bulk Operation Results ──────────────────────────────────────────────────

export interface BulkOperationResult {
  success: boolean;
  deleted?: number;
  deletedList?: string[];
  renamed?: number;
  renamedList?: string[];
  published?: number;
  publishedList?: string[];
  unpublished?: number;
  unpublishedList?: string[];
  removed?: number;
  removedList?: string[];
  fixed?: number;
  fixedList?: string[];
  errors?: number;
  errorList?: string[];
  message?: string;
}
