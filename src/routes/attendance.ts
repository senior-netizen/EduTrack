import { AttendanceStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { err, ok } from '../utils/http';

export async function attendanceRoutes(app: FastifyInstance) {
  app.post('/attendance/bulk', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HEADMASTER', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ classId: z.string(), date: z.string(), records: z.array(z.object({ studentId: z.string(), status: z.nativeEnum(AttendanceStatus), reason: z.string().optional() })) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const date = new Date(parsed.data.date);
    const writes = parsed.data.records.map((r) => app.prisma.attendanceRecord.upsert({ where: { studentId_date: { studentId: r.studentId, date } }, update: { status: r.status, reason: r.reason, classId: parsed.data.classId }, create: { schoolId: jwt.schoolId, classId: parsed.data.classId, studentId: r.studentId, date, status: r.status, reason: r.reason } }));
    await app.prisma.$transaction(writes);
    return reply.code(201).send(ok({ count: writes.length }));
  });
}
