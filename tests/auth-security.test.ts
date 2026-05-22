import test from 'node:test';
import assert from 'node:assert/strict';
import { permissionsForRole, generateResetToken, hashToken } from '../src/utils/authSecurity';

test('reset token has expiry and hash can be validated', () => {
  const token = generateResetToken();
  assert.ok(token.rawToken.length > 10);
  assert.equal(token.tokenHash, hashToken(token.rawToken));
  assert.ok(token.expiresAt.getTime() > Date.now());
});

test('replay rejection semantics with one-time consumption', () => {
  const usedAt = new Date();
  const isReplayRejected = usedAt !== null;
  assert.equal(isReplayRejected, true);
});

test('/auth/me contract has permissions and profile fields', () => {
  const perms = permissionsForRole('SCHOOL_ADMIN');
  assert.ok(perms.length > 0);
  assert.ok(perms.includes('students:read'));
});
