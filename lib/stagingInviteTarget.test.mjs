import assert from 'node:assert/strict';
import test from 'node:test';
import { isStagingInviteTarget, isStagingSystemAdmin } from './stagingInviteTarget.ts';

test('invite routes accept only the explicitly named staging Supabase hostname', () => {
  const ref = 'stagingexample123456';
  assert.equal(isStagingInviteTarget(`https://${ref}.supabase.co`, ref), true);
  assert.equal(isStagingInviteTarget('https://productionexample.supabase.co', ref), false);
  assert.equal(isStagingInviteTarget(`https://${ref}.supabase.co.attacker.invalid`, ref), false);
  assert.equal(isStagingInviteTarget(`http://${ref}.supabase.co`, ref), false);
  assert.equal(isStagingInviteTarget(`https://${ref}.supabase.co`, ''), false);
});

test('staging system admin requires the exact configured Auth user ID', () => {
  const id = '00000000-0000-4000-8000-000000000001';
  assert.equal(isStagingSystemAdmin(id, id), true);
  assert.equal(isStagingSystemAdmin('00000000-0000-4000-8000-000000000002', id), false);
  assert.equal(isStagingSystemAdmin(id, ''), false);
  assert.equal(isStagingSystemAdmin('admin@el-town.jp', id), false);
});
