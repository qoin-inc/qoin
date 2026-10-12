import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SYSTEM_SESSION_COOKIE_NAME,
  hasSystemLoginConfig,
  isSystemAdminRequest,
  systemLoginCredentialsMatch,
  systemSessionToken,
} from './systemAdminServer.ts';

test('system login fails closed until all staging credentials are configured', () => {
  const names = ['SYSTEM_LOGIN_ID', 'SYSTEM_LOGIN_PASSWORD', 'SYSTEM_SESSION_SECRET'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    for (const name of names) delete process.env[name];
    assert.equal(hasSystemLoginConfig(), false);
    assert.equal(systemLoginCredentialsMatch('admin', 'eltown-admin'), false);
    assert.equal(systemSessionToken(), '');
    assert.equal(isSystemAdminRequest(new Request('https://example.test/system')), false);
    assert.equal(isSystemAdminRequest(new Request('https://example.test/system', {
      headers: { cookie: `${SYSTEM_SESSION_COOKIE_NAME}=` },
    })), false);

    process.env.SYSTEM_LOGIN_ID = 'staging-admin';
    process.env.SYSTEM_LOGIN_PASSWORD = 'sample-password-for-test';
    process.env.SYSTEM_SESSION_SECRET = '12345678901234567890123456789012';
    assert.equal(hasSystemLoginConfig(), true);
    assert.equal(systemLoginCredentialsMatch('staging-admin', 'sample-password-for-test'), true);
    assert.equal(systemLoginCredentialsMatch('admin', 'eltown-admin'), false);
    assert.equal(isSystemAdminRequest(new Request('https://example.test/system', {
      headers: { cookie: `${SYSTEM_SESSION_COOKIE_NAME}=${systemSessionToken()}` },
    })), true);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
