/**
 * Centralized Configuration
 * 
 * All application constants, URLs, and magic values in one place.
 */

import { getEnv } from '../env';

const env = getEnv();

// ============================================================================
// URLs & Endpoints
// ============================================================================

export const URLS = {
  APP: env.NEXT_PUBLIC_APP_URL,
  CMS: env.NEXT_PUBLIC_CMS_URL,
  AUTH: env.NEXTAUTH_URL,
  
  // API Endpoints
  API: {
    SEARCH: '/api/search',
    DIGIMON: '/api/digimon',
    HEALTH: '/api/health',
    AUTH: '/api/auth',
  },
  
  // CMS Endpoints
  CMS_API: {
    USERS: `${env.NEXT_PUBLIC_CMS_URL}/api/users`,
    DIGIMON: `${env.NEXT_PUBLIC_CMS_URL}/api/digimon`,
    GUIDES: `${env.NEXT_PUBLIC_CMS_URL}/api/guides`,
    MEDIA: `${env.NEXT_PUBLIC_CMS_URL}/api/media`,
  },
} as const;

// ============================================================================
// Rate Limiting
// ============================================================================

export const RATE_LIMITS = {
  // API endpoint limits (requests per minute)
  SEARCH: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },
  DIGIMON_LIST: {
    maxRequests: 200,
    windowMs: 60 * 1000,
  },
  DIGIMON_DETAIL: {
    maxRequests: 150,
    windowMs: 60 * 1000,
  },
  AUTH: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
  ADMIN: {
    maxRequests: 50,
    windowMs: 60 * 1000,
  },
  WRITE_OPERATIONS: {
    maxRequests: 20,
    windowMs: 60 * 1000,
  },
} as const;

// ============================================================================
// Pagination
// ============================================================================

export const PAGINATION = {
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1,
  
  // Per-resource limits
  DIGIMON_LIMIT: 20,
  GUIDES_LIMIT: 12,
  COMMENTS_LIMIT: 50,
  SEARCH_LIMIT: 10,
} as const;

// ============================================================================
// Validation Limits
// ============================================================================

export const VALIDATION = {
  // String lengths
  USERNAME_MIN: 3,
  USERNAME_MAX: 30,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  EMAIL_MAX: 255,
  SLUG_MAX: 100,
  
  // Content lengths
  TITLE_MIN: 5,
  TITLE_MAX: 200,
  SUMMARY_MAX: 500,
  BIO_MAX: 500,
  COMMENT_MIN: 1,
  COMMENT_MAX: 2000,
  REVIEW_MAX: 1000,
  CONTENT_MIN: 50,
  
  // Search
  SEARCH_QUERY_MIN: 2,
  SEARCH_QUERY_MAX: 100,
  
  // Arrays
  MAX_TAGS: 10,
  TAG_MAX_LENGTH: 50,
  MAX_BULK_IDS: 100,
} as const;

// ============================================================================
// File Upload
// ============================================================================

export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
} as const;

// ============================================================================
// Cache & Revalidation
// ============================================================================

export const CACHE = {
  // Next.js revalidation times (seconds)
  STATIC_CONTENT: 3600, // 1 hour
  DYNAMIC_CONTENT: 10,  // 10 seconds
  USER_DATA: 0,         // No cache
  
  // Stale-while-revalidate
  SWR_FAST: 10,
  SWR_MEDIUM: 60,
  SWR_SLOW: 300,
} as const;

// ============================================================================
// Database
// ============================================================================

export const DATABASE = {
  // MongoDB connection
  MAX_POOL_SIZE: 10,
  MIN_POOL_SIZE: 2,
  CONNECT_TIMEOUT_MS: 10000,
  SOCKET_TIMEOUT_MS: 45000,
  SERVER_SELECTION_TIMEOUT_MS: 10000,
  
  // Retry settings
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 1000,
  MAX_RETRY_DELAY_MS: 10000,
} as const;

// ============================================================================
// Session & Authentication
// ============================================================================

export const AUTH = {
  SESSION_MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  VERIFY_EMAIL_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days
  RESET_PASSWORD_EXPIRY: 60 * 60 * 1000, // 1 hour
} as const;

// ============================================================================
// User Roles
// ============================================================================

export const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  MEMBER: 'member',
  GUEST: 'guest',
} as const;

export const ROLE_HIERARCHY = {
  [ROLES.OWNER]: 5,
  [ROLES.ADMIN]: 4,
  [ROLES.EDITOR]: 3,
  [ROLES.MEMBER]: 2,
  [ROLES.GUEST]: 1,
} as const;

// ============================================================================
// Digimon
// ============================================================================

export const DIGIMON = {
  ELEMENTS: [
    'Fire', 'Water', 'Plant', 'Wind', 'Earth', 
    'Thunder', 'Light', 'Dark', 'Neutral'
  ] as const,
  
  ATTRIBUTES: [
    'Vaccine', 'Virus', 'Data', 'Free', 'Unknown'
  ] as const,
  
  RANKS: [
    'Rookie', 'Champion', 'Ultimate', 'Mega', 
    'Armor', 'Hybrid', 'Ultra'
  ] as const,
  
  FAMILIES: [
    'Nature Spirits', 'Deep Savers', 'Nightmare Soldiers',
    'Wind Guardians', 'Metal Empire', 'Virus Busters',
    'Unknown', 'Dragon\'s Roar', 'Jungle Troopers',
  ] as const,
} as const;

// ============================================================================
// UI Constants
// ============================================================================

export const UI = {
  // Toasts
  TOAST_DURATION: 5000,
  TOAST_ERROR_DURATION: 8000,
  TOAST_SUCCESS_DURATION: 3000,
  
  // Modals
  MODAL_ANIMATION_DURATION: 200,
  
  // Debounce
  SEARCH_DEBOUNCE_MS: 300,
  INPUT_DEBOUNCE_MS: 500,
  
  // Skeleton loaders
  SKELETON_COUNT: 6,
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  ENABLE_DISCORD_AUTH: Boolean(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
  ENABLE_EMAIL_VERIFICATION: Boolean(env.EMAIL_SERVER),
  ENABLE_COMMENTS: true,
  ENABLE_RATINGS: true,
  ENABLE_USER_PROFILES: true,
  ENABLE_ADMIN_PANEL: true,
} as const;

// ============================================================================
// External Links
// ============================================================================

export const EXTERNAL_LINKS = {
  DMO_WIKI: 'https://dmowiki.com',
  DMO_OFFICIAL: env.OFFICIAL_SITE_URL || 'https://dmo.gameking.com',
  DISCORD: 'https://discord.gg/your-server',
  GITHUB: 'https://github.com/your-repo',
} as const;

// ============================================================================
// Logging
// ============================================================================

export const LOGGING = {
  ENABLED: true,
  LOG_LEVEL: env.NODE_ENV === 'production' ? 'info' : 'debug',
  LOG_API_CALLS: env.NODE_ENV === 'development',
  LOG_DATABASE_QUERIES: env.NODE_ENV === 'development',
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  GENERIC: 'An unexpected error occurred. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You must be logged in to perform this action.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  RATE_LIMIT: 'Too many requests. Please try again later.',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  SAVED: 'Changes saved successfully!',
  CREATED: 'Created successfully!',
  UPDATED: 'Updated successfully!',
  DELETED: 'Deleted successfully!',
  UPLOADED: 'Uploaded successfully!',
  EMAIL_SENT: 'Email sent successfully!',
} as const;

// ============================================================================
// Type Exports
// ============================================================================

export type DigimonElement = typeof DIGIMON.ELEMENTS[number];
export type DigimonAttribute = typeof DIGIMON.ATTRIBUTES[number];
export type DigimonRank = typeof DIGIMON.RANKS[number];
export type DigimonFamily = typeof DIGIMON.FAMILIES[number];
export type UserRole = typeof ROLES[keyof typeof ROLES];
