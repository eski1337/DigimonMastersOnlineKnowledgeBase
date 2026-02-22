import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { ApiErrorResponse } from './api-handler';
import type { UserRole } from '@dmo-kb/shared';

/**
 * Get the current authenticated user session
 */
export async function getAuthSession() {
  return await getServerSession(authOptions);
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth() {
  const session = await getAuthSession();
  
  if (!session || !session.user) {
    throw ApiErrorResponse.unauthorized('Authentication required');
  }
  
  return session;
}

/**
 * Require specific role - throws if user doesn't have required role
 */
export async function requireRole(requiredRole: UserRole | UserRole[]) {
  const session = await requireAuth();
  const userRole = session.user.role as UserRole;
  
  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  
  // Check if user has one of the required roles
  if (!allowedRoles.includes(userRole)) {
    throw ApiErrorResponse.forbidden(
      `This action requires one of the following roles: ${allowedRoles.join(', ')}`
    );
  }
  
  return session;
}

/**
 * Check if user has specific role (without throwing)
 */
export async function hasRole(requiredRole: UserRole | UserRole[]): Promise<boolean> {
  try {
    const session = await getAuthSession();
    if (!session?.user?.role) return false;
    
    const userRole = session.user.role as UserRole;
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    
    return allowedRoles.includes(userRole);
  } catch {
    return false;
  }
}

/**
 * Check if user is authenticated (without throwing)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const session = await getAuthSession();
    return !!session?.user;
  } catch {
    return false;
  }
}

/**
 * Get current user ID or throw if not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
  const session = await requireAuth();
  return session.user.id;
}

/**
 * Check if user owns a resource
 */
export async function requireOwnership(resourceOwnerId: string) {
  const session = await requireAuth();
  const userRole = session.user.role as UserRole;
  
  // Admins and owners can access any resource
  if (['admin', 'owner'].includes(userRole)) {
    return session;
  }
  
  // Regular users can only access their own resources
  if (session.user.id !== resourceOwnerId) {
    throw ApiErrorResponse.forbidden('You can only access your own resources');
  }
  
  return session;
}

/**
 * Role hierarchy for permission checks
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  member: 2,
  guest: 1,
};

/**
 * Check if user has at least a certain role level
 */
export async function requireMinRole(minRole: UserRole) {
  const session = await requireAuth();
  const userRole = session.user.role as UserRole;
  
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[minRole] || 0;
  
  if (userLevel < requiredLevel) {
    throw ApiErrorResponse.forbidden(
      `This action requires at least ${minRole} role`
    );
  }
  
  return session;
}
