export const ADMIN_INVITE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminInviteRecord = {
  status: string | null;
  invited_at: string | null;
  admin_email: string | null;
  admin_auth_id: string | null;
};

export type InviteDecision =
  | { ok: true }
  | { ok: false; code: 'used' | 'invalid' | 'expired' | 'email_mismatch' | 'linked' };

export function validateAdminInviteAcceptance(
  invite: AdminInviteRecord,
  user: { id: string; email: string | null },
  now = Date.now(),
): InviteDecision {
  if (invite.status === 'active') return { ok: false, code: 'used' };
  if (invite.status !== 'pending') return { ok: false, code: 'invalid' };

  const invitedAt = Date.parse(invite.invited_at || '');
  if (!Number.isFinite(invitedAt) || invitedAt > now || invitedAt + ADMIN_INVITE_VALIDITY_MS <= now) {
    return { ok: false, code: 'expired' };
  }

  const invitedEmail = String(invite.admin_email || '').trim().toLowerCase();
  const userEmail = String(user.email || '').trim().toLowerCase();
  if (!invitedEmail || !userEmail || invitedEmail !== userEmail) {
    return { ok: false, code: 'email_mismatch' };
  }
  if (invite.admin_auth_id) {
    return { ok: false, code: 'linked' };
  }
  return { ok: true };
}
