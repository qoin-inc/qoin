import { ADMIN_INVITE_VALIDITY_MS } from './adminInviteAcceptance.ts';

export const countsTowardAdminLimit = (admin, now = Date.now()) => {
  if (admin.status === 'retired' || admin.status === 'rejected') return false;
  if (admin.status !== 'pending') return true;
  const invitedAt = Date.parse(admin.invited_at || '');
  return !Number.isFinite(invitedAt) || invitedAt + ADMIN_INVITE_VALIDITY_MS > now;
};

export const canChangeAdminStatus = (rows, target, nextStatus) => {
  if (nextStatus === 'active') return target.status === 'retired' && Boolean(target.admin_auth_id);
  return target.status === 'active' && rows.filter((row) => row.status === 'active').length > 1;
};
