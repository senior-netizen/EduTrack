import { AttendanceStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AttendanceService } from '../services/attendanceService';
import { err, ok } from '../utils/http';
import { ensureClassInSchool, ensureStudentInSchool, ensureTeacherCanAccessClass } from '../utils/schoolScope';

export async function attendanceRoutes(app: FastifyInstance) {
  const service = new AttendanceService(app.prisma);

  app.post('/attendance/bulk', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HEADMASTER', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ classId: z.string(), date: z.string(), records: z.array(z.object({ studentId: z.string(), status: z.nativeEnum(AttendanceStatus), reason: z.string().optional() })) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));
    const classCheck = await ensureClassInSchool(app, reply, parsed.data.classId, jwt.schoolId);
    if (!classCheck.ok) return classCheck.response;

    const teacherClassScope = await ensureTeacherCanAccessClass(reply, jwt, classCheck.klass.classTeacherId);
    if (!teacherClassScope.ok) return teacherClassScope.response;

    for (const record of parsed.data.records) {
      const studentCheck = await ensureStudentInSchool(app, reply, record.studentId, jwt.schoolId);
      if (!studentCheck.ok) return studentCheck.response;
      if (studentCheck.student.classId !== parsed.data.classId) {
        return reply.code(403).send(fail('FORBIDDEN', 'Student does not belong to selected class'));
      }
    }

    const date = new Date(parsed.data.date);
    const writes = parsed.data.records.map((r) => app.prisma.attendanceRecord.upsert({ where: { studentId_date: { studentId: r.studentId, date } }, update: { status: r.status, reason: r.reason, classId: parsed.data.classId }, create: { schoolId: jwt.schoolId, classId: parsed.data.classId, studentId: r.studentId, date, status: r.status, reason: r.reason } }));
    await app.prisma.$transaction(writes);
    return reply.code(201).send(created({ count: writes.length }));
  });

  app.post('/attendance', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HEADMASTER', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ classId: z.string(), date: z.string(), records: z.array(z.object({ studentId: z.string(), status: z.nativeEnum(AttendanceStatus), reason: z.string().optional() })) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const date = new Date(parsed.data.date);
    const writes = parsed.data.records.map((r) => app.prisma.attendanceRecord.upsert({ where: { studentId_date: { studentId: r.studentId, date } }, update: { status: r.status, reason: r.reason, classId: parsed.data.classId }, create: { schoolId: jwt.schoolId, classId: parsed.data.classId, studentId: r.studentId, date, status: r.status, reason: r.reason } }));
    await app.prisma.$transaction(writes);
    return reply.code(201).send(ok({ count: writes.length }));
  });

  app.get('/attendance/register/daily', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HEADMASTER', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ classId: z.string(), date: z.string() }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const rows = await service.getDailyClassRegister(jwt.schoolId, parsed.data.classId, new Date(parsed.data.date));
    return reply.send(ok(rows));
  });

  app.get('/attendance/class/:classId', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HEADMASTER', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ classId: z.string(), date: z.string() }).safeParse({ ...(request.params as Record<string, unknown>), ...(request.query as Record<string, unknown>) });
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const rows = await service.getDailyClassRegister(jwt.schoolId, parsed.data.classId, new Date(parsed.data.date));
    return reply.send(ok(rows));
  });

  app.get('/attendance/students/:studentId/history', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ studentId: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }).safeParse({ ...(request.params as Record<string, unknown>), ...(request.query as Record<string, unknown>) });
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const rows = await service.getStudentAttendanceHistory(jwt.schoolId, parsed.data.studentId, parsed.data.startDate ? new Date(parsed.data.startDate) : undefined, parsed.data.endDate ? new Date(parsed.data.endDate) : undefined);
    return reply.send(ok(rows));
  });

  app.get('/attendance/student/:studentId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ studentId: z.string(), startDate: z.string().optional(), endDate: z.string().optional() }).safeParse({ ...(request.params as Record<string, unknown>), ...(request.query as Record<string, unknown>) });
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const rows = await service.getStudentAttendanceHistory(jwt.schoolId, parsed.data.studentId, parsed.data.startDate ? new Date(parsed.data.startDate) : undefined, parsed.data.endDate ? new Date(parsed.data.endDate) : undefined);
    return reply.send(ok(rows));
  });

  app.get('/attendance/percentage/student/:studentId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ studentId: z.string(), startDate: z.string(), endDate: z.string() }).safeParse({ ...(request.params as Record<string, unknown>), ...(request.query as Record<string, unknown>) });
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const stats = await service.getAttendancePercentageByStudent(jwt.schoolId, parsed.data.studentId, new Date(parsed.data.startDate), new Date(parsed.data.endDate));
    return reply.send(ok(stats));
  });

  app.get('/attendance/percentage/class/:classId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ classId: z.string(), startDate: z.string(), endDate: z.string() }).safeParse({ ...(request.params as Record<string, unknown>), ...(request.query as Record<string, unknown>) });
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const stats = await service.getAttendancePercentageByClass(jwt.schoolId, parsed.data.classId, new Date(parsed.data.startDate), new Date(parsed.data.endDate));
    return reply.send(ok(stats));
  });

  app.get('/attendance/percentage/term/:termId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ termId: z.string() }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const stats = await service.getAttendancePercentageByTerm(jwt.schoolId, parsed.data.termId);
    return reply.send(ok(stats));
  });

  app.get('/attendance/summary/monthly', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const parsed = z.object({ classId: z.string(), year: z.coerce.number().int(), month: z.coerce.number().int().min(1).max(12) }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', parsed.error.issues));
    const summary = await service.getMonthlySummary(jwt.schoolId, parsed.data.classId, parsed.data.year, parsed.data.month);
    return reply.send(ok(summary));
  });
}
