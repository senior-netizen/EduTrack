import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { err, ok } from '../utils/http';

export async function academicRoutes(app: FastifyInstance) {
  app.post('/terms', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ academicYear: z.string(), name: z.string(), startDate: z.string(), endDate: z.string(), isActive: z.boolean().default(false) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const term = await app.prisma.term.create({ data: { ...parsed.data, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), schoolId: jwt.schoolId } });
    return reply.code(201).send(ok(term));
  });

  app.post('/classes', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ name: z.string(), grade: z.string(), stream: z.string().optional(), capacity: z.number().int().positive().default(45), classTeacherId: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const created = await app.prisma.class.create({ data: { ...parsed.data, schoolId: jwt.schoolId } });
    return reply.code(201).send(ok(created));
  });

  app.post('/subjects', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER', 'HOD'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ name: z.string(), code: z.string(), department: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const created = await app.prisma.subject.create({ data: { ...parsed.data, schoolId: jwt.schoolId } });
    return reply.code(201).send(ok(created));
  });
}
