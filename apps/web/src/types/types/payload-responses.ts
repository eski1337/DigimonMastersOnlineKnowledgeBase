/**
 * Type definitions for Payload CMS API responses
 */

export interface PayloadDoc {
  id: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface PayloadResponse<T = Record<string, unknown>> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  pagingCounter: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  prevPage: number | null;
  nextPage: number | null;
}

export interface DigimonDoc extends PayloadDoc {
  name: string;
  slug: string;
  form: string;
  rank?: string;
  type?: string;
  attackerType?: string;
  element: string;
  attribute: string;
  introduction?: string;
  icon?: string | { url: string };
  mainImage?: string | { url: string };
  images?: Array<{ image: string | { url: string } }>;
  families?: string[];
  published?: boolean;
  stats?: {
    hp?: number;
    ds?: number;
    at?: number;
    de?: number;
    as?: number;
    ct?: number;
    ht?: number;
    ev?: number;
  };
  maxStats?: {
    hp?: number;
    ds?: number;
    at?: number;
    de?: number;
    as?: number;
    ct?: number;
    ht?: number;
    ev?: number;
  };
  skills?: Array<{
    name: string;
    description?: string;
    type?: string;
    element?: string;
    cooldown?: number;
    dsConsumption?: number;
    damagePerLevel?: string;
  }>;
  digivolutions?: {
    digivolvesFrom?: Array<{ name: string; requirements?: string }>;
    digivolvesTo?: Array<{ name: string; requiredLevel?: number; requiredItem?: string }>;
  };
}

export interface GuideDoc extends PayloadDoc {
  title: string;
  slug: string;
  summary?: string;
  coverImage?: string;
  content?: unknown;
  author?: string;
}

export interface QuestDoc extends PayloadDoc {
  title: string;
  slug: string;
  type?: string;
  level?: number;
  description?: string;
  rewards?: unknown;
}

export interface MapDoc extends PayloadDoc {
  name: string;
  slug: string;
  region?: string;
  mapType?: string;
  levelRange?: string;
  description?: string;
  published?: boolean;
  image?: { url: string; alt?: string; width?: number; height?: number } | string;
  mapImage?: { url: string; alt?: string; width?: number; height?: number } | string;
  gallery?: Array<{ image: { url: string; alt?: string; width?: number; height?: number } | string; caption?: string }>;
  npcs?: Array<{ name: string; role?: string; icon?: { url: string } | string }>;
  wildDigimon?: Array<{ name: string; level?: string; element?: string; attribute?: string }>;
  portals?: Array<{ destination: string; requirements?: string }>;
  bosses?: Array<{ name: string; level?: string }>;
  notes?: unknown;
}

export interface ToolDoc extends PayloadDoc {
  title: string;
  slug: string;
  description?: string;
  category?: string;
  url?: string;
}

export interface PatchNoteDoc extends PayloadDoc {
  title: string;
  slug: string;
  version?: string;
  content: string;
  htmlContent?: string;
  publishedDate: string;
  url?: string;
  sourceId?: number;
  sourceHash?: string;
  published?: boolean;
}
