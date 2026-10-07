import assert from 'node:assert/strict';
import test from 'node:test';
import { canChangeAdminStatus, countsTowardAdminLimit } from './adminInviteManagement.mjs';

const now = Date.parse('2026-10-08T00:00:00.000Z');
const active = { id: 1, status: 'active', admin_auth_id: 'user-a', invited_at: null };
const another = { id: 2, status: 'active', admin_auth_id: 'user-b', invited_at: null };
const pending = { id: 3, status: 'pending', admin_auth_id: null, invited_at: new Date(now - 60_000).toISOString() };

test('active and current invites count, while retired and expired invites do not', () => {
  assert.equal(countsTowardAdminLimit(active, now), true);
  assert.equal(countsTowardAdminLimit(pending, now), true);
  assert.equal(countsTowardAdminLimit({ ...pending, invited_at: new Date(now - 8 * 24 * 60 * 60 * 1000).toISOString() }, now), false);
  assert.equal(countsTowardAdminLimit({ ...pending, invited_at: null }, now), true);
  assert.equal(countsTowardAdminLimit({ ...active, status: 'retired' }, now), false);
});

test('only registered retired officers revive and the last active officer cannot retire', () => {
  assert.equal(canChangeAdminStatus([active], active, 'retired'), false);
  assert.equal(canChangeAdminStatus([active, another], active, 'retired'), true);
  assert.equal(canChangeAdminStatus([active, pending], pending, 'active'), false);
  assert.equal(canChangeAdminStatus([active], { ...another, status: 'retired' }, 'active'), true);
  assert.equal(canChangeAdminStatus([active], { ...another, status: 'retired', admin_auth_id: null }, 'active'), false);
});
