// ============================================================================
// Digimon Constants
// ============================================================================

export const DIGIMON_ELEMENTS = [
  'Fire', 'Water', 'Ice', 'Wind', 'Thunder',
  'Light', 'Pitch Black', 'Land', 'Wood', 'Steel', 'Neutral',
] as const;

export const DIGIMON_ATTRIBUTES = [
  'Vaccine', 'Virus', 'Data', 'Unknown', 'None',
] as const;

export const DIGIMON_RANKS = [
  'N', 'A', 'A+', 'S', 'S+', 'SS', 'SS+', 'SSS', 'SSS+', 'U', 'U+',
] as const;

export const DIGIMON_FAMILIES = [
  'Nature Spirits', 'Deep Savers', 'Nightmare Soldiers',
  'Wind Guardians', 'Metal Empire', 'Virus Busters',
  'Dragon\'s Roar', 'Jungle Troopers', 'Dark Area', 'Unknown',
] as const;

export const DIGIMON_FORMS = [
  'Fresh', 'In-Training', 'Rookie', 'Champion', 'Ultimate', 'Mega', 'Side Mega',
  'Burst Mode', 'Jogress', 'Jogress Mega', 'Armor', 'Ultra',
  'Rookie X', 'Champion X', 'Ultimate X', 'Mega X',
  'Burst Mode X', 'Jogress X', 'X-Antibody',
  'H-Hybrid', 'B-Hybrid', 'A-Hybrid', 'Z-Hybrid', 'O-Hybrid',
  'DigiXros', 'Double Xros', 'Great Xros',
  'Spirit', 'De-Digivolve', 'Mutant', 'Variant', 'Unknown',
] as const;

export const DIGIMON_ATTACKER_TYPES = [
  'Quick Attacker', 'Short Attacker', 'Near Attacker', 'Defender',
] as const;

// ============================================================================
// Quest & Tool Constants
// ============================================================================

export const QUEST_TYPES = [
  'Main', 'Side', 'Daily', 'Weekly', 'Event', 'Dungeon', 'Boss',
] as const;

export const TOOL_TYPES = [
  'Calculator', 'Simulator', 'Planner', 'Reference', 'Utility',
] as const;

// ============================================================================
// User Roles
// ============================================================================

export const USER_ROLES = ['guest', 'member', 'editor', 'admin', 'owner'] as const;

// ============================================================================
// Types
// ============================================================================

export type DigimonElement = typeof DIGIMON_ELEMENTS[number];
export type DigimonAttribute = typeof DIGIMON_ATTRIBUTES[number];
export type DigimonRank = typeof DIGIMON_RANKS[number];
export type DigimonFamily = typeof DIGIMON_FAMILIES[number];
export type DigimonForm = typeof DIGIMON_FORMS[number];
export type DigimonAttackerType = typeof DIGIMON_ATTACKER_TYPES[number];
export type QuestType = typeof QUEST_TYPES[number];
export type ToolType = typeof TOOL_TYPES[number];
export type UserRole = typeof USER_ROLES[number];

export interface DigimonFilters {
  search?: string;
  element?: DigimonElement[];
  attribute?: DigimonAttribute[];
  rank?: DigimonRank[];
  family?: DigimonFamily[];
  form?: DigimonForm[];
  attackerType?: DigimonAttackerType[];
}

export interface Digimon {
  id: string;
  name: string;
  slug: string;
  form: DigimonForm;
  rank?: DigimonRank;
  type?: string;
  attackerType?: DigimonAttackerType;
  element: DigimonElement;
  attribute: DigimonAttribute;
  families?: DigimonFamily[];
  introduction?: string;
  icon?: { url: string } | null;
  mainImage?: { url: string } | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
