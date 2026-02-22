import type { UserRole } from '@dmo-kb/shared';

const roleHierarchy: Record<UserRole, number> = {
  guest: 0,
  member: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canEdit(userRole: UserRole): boolean {
  return hasPermission(userRole, 'editor');
}

export function canAdmin(userRole: UserRole): boolean {
  return hasPermission(userRole, 'admin');
}

export function canManageUsers(userRole: UserRole): boolean {
  return hasPermission(userRole, 'admin');
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    guest: 'text-gray-400',
    member: 'text-blue-400',
    editor: 'text-green-400',
    admin: 'text-purple-400',
    owner: 'text-orange-400',
  };
  return colors[role];
}

export function getRoleBadgeVariant(
  role: UserRole
): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variants: Record<UserRole, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    guest: 'outline',
    member: 'secondary',
    editor: 'default',
    admin: 'default',
    owner: 'destructive',
  };
  return variants[role];
}
