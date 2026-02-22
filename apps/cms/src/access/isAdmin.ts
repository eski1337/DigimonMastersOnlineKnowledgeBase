import type { Access } from 'payload/config';

export const isAdmin: Access = ({ req: { user } }) => {
  if (!user) return false;
  return ['admin', 'owner'].includes(user.role);
};
