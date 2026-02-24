import type { Access } from 'payload/config';

/** Admin, Owner, or Editor (staff) can access */
export const isStaff: Access = ({ req: { user } }) => {
  if (!user) return false;
  return ['editor', 'admin', 'owner'].includes(user.role);
};
