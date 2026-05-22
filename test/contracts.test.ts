import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/server';

test('contract suite representative endpoints', async () => {
  const app = await buildApp();
  await app.ready();
  const token = app.jwt.sign({ userId: 'u1', schoolId: 's1', role: 'SUPER_ADMIN', email: 'admin@x.com' });

  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);

  const authValidation = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email: 'x' } });
  assert.equal(authValidation.statusCode, 400);

  const upload = await app.inject({
    method: 'POST',
    url: '/api/v1/files/upload',
    headers: { authorization: `Bearer ${token}` },
    payload: { category: 'avatars', filename: 'a.png', contentType: 'image/png', base64: 'ZmFrZQ==' }
  });
  assert.equal(upload.statusCode, 201);

  const report = await app.inject({
    method: 'POST',
    url: '/api/v1/reports/export',
    headers: { authorization: `Bearer ${token}` },
    payload: { domain: 'attendance', format: 'pdf' }
  });
  assert.equal(report.statusCode, 202);

  const audit = await app.inject({ method: 'GET', url: '/api/v1/audit-trail', headers: { authorization: `Bearer ${token}` } });
  assert.equal(audit.statusCode, 200);

  await app.close();
});
