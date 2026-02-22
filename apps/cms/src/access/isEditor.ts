import type { Access } from 'payload/config';

export const isEditor: Access = ({ req: { user } }) => {
  if (!user) return false;
  return ['editor', 'admin', 'owner'].includes(user.role);
};
