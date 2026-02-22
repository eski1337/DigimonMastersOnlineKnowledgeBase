import type { Access } from 'payload/config';

export const isOwner: Access = ({ req: { user } }) => {
  if (!user) return false;
  return user.role === 'owner';
};
