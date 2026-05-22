import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { err, ok } from '../utils/http';

export async function platformRoutes(app: FastifyInstance) {
  app.post('/notifications/queue', { preHandler: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({ channel: z.enum(['email', 'sms', 'whatsapp']), recipient: z.string(), message: z.string(), maxAttempts: z.number().int().min(1).max(10).default(3) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));

    const job = app.notificationQueue.enqueue(parsed.data);
    app.auditTrail.capture({ actorId: (request.user as any)?.userId ?? null, action: 'notification.enqueue', resourceType: 'notification_job', resourceId: job.id, metadata: { channel: job.channel } });
    return reply.code(201).send(ok(job));
  });

  app.post('/notifications/process-next', { preHandler: [app.authenticate] }, async () => ok(await app.notificationQueue.processNext()));
  app.get('/notifications/queue', { preHandler: [app.authenticate] }, async () => ok(app.notificationQueue.getSnapshot()));

  app.post('/files/upload', { preHandler: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({ category: z.enum(['avatars', 'documents', 'logos', 'report_cards']), filename: z.string(), contentType: z.string(), base64: z.string() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const uploaded = app.fileStorage.put(parsed.data.category, parsed.data.filename, parsed.data.contentType, parsed.data.base64);
    app.auditTrail.capture({ actorId: (request.user as any)?.userId ?? null, action: 'file.upload', resourceType: parsed.data.category, resourceId: uploaded.id, metadata: { filename: parsed.data.filename } });
    return reply.code(201).send(ok(uploaded));
  });

  app.get('/files/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const file = app.fileStorage.get((request.params as any).id);
    if (!file) return reply.code(404).send(err('NOT_FOUND', 'File not found'));
    return ok(file);
  });

  app.post('/reports/export', { preHandler: [app.authenticate] }, async (request, reply) => {
    const schema = z.object({ domain: z.enum(['attendance', 'exams', 'fees']), format: z.enum(['pdf', 'excel']), filters: z.record(z.any()).optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));

    const report = { id: crypto.randomUUID(), domain: parsed.data.domain, format: parsed.data.format, status: 'queued', generatedAt: new Date().toISOString() };
    app.auditTrail.capture({ actorId: (request.user as any)?.userId ?? null, action: 'report.export', resourceType: 'report', resourceId: report.id, metadata: parsed.data });
    return reply.code(202).send(ok(report));
  });

  app.get('/audit-trail', { preHandler: [app.authenticate] }, async (request) => {
    const limit = Number((request.query as any)?.limit ?? 100);
    return ok(app.auditTrail.list(limit));
  });
}
