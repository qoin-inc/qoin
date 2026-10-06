import assert from 'node:assert/strict';
import test from 'node:test';
import { validateAdminInviteAcceptance, ADMIN_INVITE_VALIDITY_MS } from './adminInviteAcceptance.ts';

const now = Date.parse('2026-10-07T00:00:00.000Z');
const pending = {
  status: 'pending',
  invited_at: new Date(now - 60_000).toISOString(),
  admin_email: 'Officer@Example.jp',
  admin_auth_id: null,
};
const user = { id: 'user-1', email: 'officer@example.jp' };

test('accepts a current invitation for the matching authenticated email', () => {
  assert.deepEqual(validateAdminInviteAcceptance(pending, user, now), { ok: true });
});

test('rejects used, revoked, linked, and wrong-email invitations', () => {
  assert.deepEqual(validateAdminInviteAcceptance({ ...pending, status: 'active' }, user, now), { ok: false, code: 'used' });
  assert.deepEqual(validateAdminInviteAcceptance({ ...pending, status: 'retired' }, user, now), { ok: false, code: 'invalid' });
  assert.deepEqual(validateAdminInviteAcceptance({ ...pending, admin_auth_id: user.id }, user, now), { ok: false, code: 'linked' });
  assert.deepEqual(validateAdminInviteAcceptance(pending, { ...user, email: 'other@example.jp' }, now), { ok: false, code: 'email_mismatch' });
});

test('rejects expired, missing, and future issue times', () => {
  assert.deepEqual(validateAdminInviteAcceptance({ ...pending, invited_at: new Date(now - ADMIN_INVITE_VALIDITY_MS).toISOString() }, user, now), { ok: false, code: 'expired' });
  assert.deepEqual(validateAdminInviteAcceptance({ ...pending, invited_at: null }, user, now), { ok: false, code: 'expired' });
  assert.deepEqual(validateAdminInviteAcceptance({ ...pending, invited_at: new Date(now + 60_000).toISOString() }, user, now), { ok: false, code: 'expired' });
});
