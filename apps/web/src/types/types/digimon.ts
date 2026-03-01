// Payload Media Type
export interface PayloadMedia {
  id: string;
  url?: string;
  filename?: string;
  mimeType?: string;
  filesize?: number;
  width?: number;
  height?: number;
}

// Digimon Reference (for relationships)
export interface DigimonReference {
  id: string;
  name: string;
  slug?: string;
}

// Skill Interface
export interface DigimonSkill {
  name: string;
  description?: string;
  type?: 'Attack' | 'Support' | 'Passive';
  element?: string;
  icon?: string | PayloadMedia;
  iconUrl?: string;
  cooldown?: number;
  dsCost?: number;
  power?: number;
  skillPoints?: number;
}

// Stats Interface
export interface DigimonStats {
  hp?: number;
  ds?: number;
  at?: number;
  de?: number;
  ct?: number;
  ht?: number;
  bl?: number;
  ev?: number;
}

// Digivolution Data
export interface DigivolutionData {
  digivolvesFrom?: DigimonReference[];
  digivolvesTo?: DigimonReference[];
  jogress?: DigimonReference[];
}

// Special Effects
export interface SpecialEffects {
  f1?: {
    effect: string;
    duration: number;
    activation: number;
    buffEffect: string;
  };
  f2?: {
    effect: string;
    duration: number;
    activation: number;
    buffEffect: string;
  };
  f3?: {
    effect: string;
    duration: number;
    activation: number;
    buffEffect: string;
  };
  f4?: {
    effect: string;
    duration: number;
    activation: number;
    buffEffect: string;
  };
}

// U Rank Passives
export interface URankPassives {
  attribute?: string;
  family1?: string;
  family2?: string;
  element?: string;
}

// SSS+ Passives
export interface SSSPassives {
  passive1?: string;
  passive2?: string;
  passive3?: string;
}

// Full Digimon Type
export interface Digimon {
  id: string;
  slug: string;
  name: string;
  form?: string;
  rank?: string;
  attribute?: string;
  element?: string;
  family?: string[];
  families?: string[];
  attackerType?: string;
  type?: string;
  
  // Images
  icon?: string | PayloadMedia;
  iconUrl?: string;
  mainImage?: string | PayloadMedia;
  mainImageUrl?: string;
  images?: (string | PayloadMedia)[];
  
  // Stats & Skills
  stats?: DigimonStats;
  maxStats?: DigimonStats;
  skills?: DigimonSkill[];
  
  // Digivolution
  digivolutions?: DigivolutionData;
  
  // Special abilities
  specialEffects?: SpecialEffects;
  uRankPassives?: URankPassives;
  sssPassives?: SSSPassives;
  
  // Additional info
  introduction?: string;
  sizePct?: number;
  obtain?: string;
  sources?: string[];
  notes?: string;
  description?: string;
  
  // Unlock requirements
  defaultLevel?: number;
  unlockRequirements?: string;
  unlockItems?: string[];
  
  // Availability & Features
  available?: boolean;
  canBeRidden?: boolean;
  canBeHatched?: boolean;
  rideability?: {
    canBeRidden?: boolean;
    speed?: number;
  };
  availability?: {
    canBeHatched?: boolean;
    obtainMethod?: string;
  };
  
  // Metadata
  published?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// API Response Types
export interface DigimonListResponse {
  docs: Digimon[];
  totalDocs: number;
  limit: number;
  page: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Error Response
export interface ErrorResponse {
  message?: string;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}
