import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { created, fail, mapZodIssues, ok } from '../utils/http';
import { z } from 'zod';

test('response utility envelopes: 2xx/4xx', () => {
  assert.deepEqual(ok({ x: 1 }), { success: true, data: { x: 1 } });
  assert.deepEqual(created({ id: '1' }), { success: true, data: { id: '1' } });
  assert.deepEqual(fail('VALIDATION_ERROR', 'Invalid payload', [{ field: 'email', issue: 'Invalid email' }]), {
    success: false,
    error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: [{ field: 'email', issue: 'Invalid email' }] }
  });
});

test('validation details map to contract format', () => {
  const schema = z.object({ email: z.string().email() });
  const parsed = schema.safeParse({ email: 'x' });
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    const details = mapZodIssues(parsed.error.issues);
    assert.equal(details[0].field, 'email');
    assert.ok(details[0].issue.length > 0);
  }
});

test('global error handler returns canonical 5xx envelope', async () => {
  const app = Fastify();
  app.setErrorHandler((error, _req, reply) => reply.code(500).send(fail('INTERNAL_ERROR', (error as Error).message)));
  app.get('/boom', async () => { throw new Error('kaboom'); });
  const res = await app.inject({ method: 'GET', url: '/boom' });
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.json(), { success: false, error: { code: 'INTERNAL_ERROR', message: 'kaboom' } });
  await app.close();
});
