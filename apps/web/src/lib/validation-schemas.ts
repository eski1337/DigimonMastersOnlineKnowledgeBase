/**
 * Validation Schemas for API Requests
 * 
 * Centralized Zod schemas for consistent input validation across all API routes.
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(100, 'Slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

export const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email is too short')
  .max(255, 'Email is too long');

export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const idSchema = z.string()
  .min(1, 'ID is required')
  .max(50, 'ID is too long');

// ============================================================================
// Pagination Schemas
// ============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type PaginationParams = z.infer<typeof paginationSchema>;

// ============================================================================
// Search Schemas
// ============================================================================

export const searchQuerySchema = z.object({
  q: z.string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query is too long'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

// ============================================================================
// Digimon Schemas
// ============================================================================

export const digimonFilterSchema = z.object({
  element: z.enum(['Fire', 'Water', 'Ice', 'Wind', 'Thunder', 'Light', 'Pitch Black', 'Land', 'Wood', 'Steel', 'Neutral']).optional(),
  attribute: z.enum(['Vaccine', 'Virus', 'Data', 'Free', 'Unknown']).optional(),
  rank: z.enum(['N', 'A', 'A+', 'S', 'S+', 'SS', 'SS+', 'SSS', 'SSS+', 'U', 'U+']).optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(10),
});

export type DigimonFilters = z.infer<typeof digimonFilterSchema>;

export const digimonSlugSchema = z.object({
  slug: slugSchema,
});

// ============================================================================
// Authentication Schemas
// ============================================================================

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// ============================================================================
// User Profile Schemas
// ============================================================================

export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  bio: z.string().max(500, 'Bio is too long').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ============================================================================
// Comment/Review Schemas
// ============================================================================

export const createCommentSchema = z.object({
  content: z.string()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment is too long'),
  parentId: idSchema.optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z.string().max(1000, 'Review is too long').optional(),
});

export type RatingInput = z.infer<typeof ratingSchema>;

// ============================================================================
// Content Management Schemas
// ============================================================================

export const createGuideSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title is too long'),
  slug: slugSchema,
  content: z.string().min(50, 'Content must be at least 50 characters'),
  summary: z.string().max(500, 'Summary is too long').optional(),
  tags: z.array(z.string().max(50)).max(10, 'Too many tags').optional(),
  published: z.boolean().default(false),
});

export type CreateGuideInput = z.infer<typeof createGuideSchema>;

export const updateGuideSchema = createGuideSchema.partial().extend({
  id: idSchema,
});

export type UpdateGuideInput = z.infer<typeof updateGuideSchema>;

// ============================================================================
// File Upload Schemas
// ============================================================================

export const imageUploadSchema = z.object({
  file: z.instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, 'File size must be less than 5MB')
    .refine(
      (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
      'File must be an image (JPEG, PNG, GIF, or WebP)'
    ),
  alt: z.string().max(200, 'Alt text is too long').optional(),
});

export type ImageUploadInput = z.infer<typeof imageUploadSchema>;

// ============================================================================
// Admin Schemas
// ============================================================================

export const bulkDeleteSchema = z.object({
  ids: z.array(idSchema)
    .min(1, 'At least one ID is required')
    .max(100, 'Too many IDs (max 100)'),
});

export type BulkDeleteInput = z.infer<typeof bulkDeleteSchema>;

export const updateUserRoleSchema = z.object({
  userId: idSchema,
  role: z.enum(['owner', 'admin', 'editor', 'member', 'guest']),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Safely parse and validate data against a schema
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown) {
  return schema.safeParse(data);
}

/**
 * Parse and validate data, throwing on error
 */
export function parseOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Validate query parameters from URL
 */
export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  searchParams: URLSearchParams
): T {
  const params = Object.fromEntries(searchParams.entries());
  return schema.parse(params);
}
