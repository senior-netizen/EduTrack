import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { err, ok } from '../utils/http';
import { ensureClassInSchool, ensureExamInSchool, ensureExamPaperInExam, ensureStudentInSchool, ensureTeacherCanAccessSubjectForClass, ensureTermInSchool } from '../utils/schoolScope';
import { computePositions, computeWeightedPercentage, resolveGrade } from '../utils/grading';

export async function examRoutes(app: FastifyInstance) {
  app.post('/exams', { preHandler: [app.authenticate, app.authorize(['SCHOOL_ADMIN', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ termId: z.string(), name: z.string(), startDate: z.string(), endDate: z.string(), weight: z.number().min(0).max(100) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));
    const termCheck = await ensureTermInSchool(app, reply, parsed.data.termId, jwt.schoolId);
    if (!termCheck.ok) return termCheck.response;

    const created = await app.prisma.exam.create({ data: { schoolId: jwt.schoolId, ...parsed.data, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate) } });
    return reply.code(201).send(ok(created));
  });

  app.post('/exam-papers', { preHandler: [app.authenticate, app.authorize(['SCHOOL_ADMIN', 'HEADMASTER', 'HOD'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ examId: z.string(), subjectId: z.string(), maxMarks: z.number().positive(), paperCode: z.string().optional(), examDate: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), venue: z.string().optional() });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(p.error.issues)));
    const examCheck = await ensureExamInSchool(app, reply, p.data.examId, jwt.schoolId);
    if (!examCheck.ok) return examCheck.response;
    const paper = await app.prisma.examPaper.create({ data: { ...p.data, examDate: p.data.examDate ? new Date(p.data.examDate) : undefined } });
    return reply.code(201).send(ok(paper));
  });

  app.get('/exam-papers/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const id = (request.params as any).id;
    const paper = await app.prisma.examPaper.findUnique({ where: { id }, include: { exam: true, subject: true } });
    if (!paper) return reply.code(404).send(err('NOT_FOUND', 'Exam paper not found'));
    if (paper.exam.schoolId !== jwt.schoolId) return reply.code(403).send(err('FORBIDDEN', 'Exam paper belongs to another school'));
    return ok(paper);
  });

  app.patch('/exam-papers/:id', { preHandler: [app.authenticate, app.authorize(['SCHOOL_ADMIN', 'HEADMASTER', 'HOD'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const id = (request.params as any).id;
    const schema = z.object({ maxMarks: z.number().positive().optional(), paperCode: z.string().optional(), examDate: z.string().optional(), startTime: z.string().optional(), endTime: z.string().optional(), venue: z.string().optional() });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', p.error.issues));
    const paper = await app.prisma.examPaper.findUnique({ where: { id }, include: { exam: true } });
    if (!paper) return reply.code(404).send(err('NOT_FOUND', 'Exam paper not found'));
    if (paper.exam.schoolId !== jwt.schoolId) return reply.code(403).send(err('FORBIDDEN', 'Exam paper belongs to another school'));
    const updated = await app.prisma.examPaper.update({ where: { id }, data: { ...p.data, examDate: p.data.examDate ? new Date(p.data.examDate) : undefined } });
    return ok(updated);
  });

  app.delete('/exam-papers/:id', { preHandler: [app.authenticate, app.authorize(['SCHOOL_ADMIN', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const id = (request.params as any).id;
    const paper = await app.prisma.examPaper.findUnique({ where: { id }, include: { exam: true } });
    if (!paper) return reply.code(404).send(err('NOT_FOUND', 'Exam paper not found'));
    if (paper.exam.schoolId !== jwt.schoolId) return reply.code(403).send(err('FORBIDDEN', 'Exam paper belongs to another school'));
    await app.prisma.examPaper.delete({ where: { id } });
    return ok({ deleted: true });
  });

  app.post('/grading-scales', { preHandler: [app.authenticate, app.authorize(['SCHOOL_ADMIN', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ name: z.string(), termId: z.string().optional(), classId: z.string().optional(), isDefault: z.boolean().optional(), bands: z.array(z.object({ minScore: z.number(), maxScore: z.number(), grade: z.string(), points: z.number().optional(), remark: z.string().optional() })).min(1) });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', p.error.issues));
    if (p.data.termId) { const c = await ensureTermInSchool(app, reply, p.data.termId, jwt.schoolId); if (!c.ok) return c.response; }
    if (p.data.classId) { const c = await ensureClassInSchool(app, reply, p.data.classId, jwt.schoolId); if (!c.ok) return c.response; }
    const created = await app.prisma.gradingScale.create({ data: { schoolId: jwt.schoolId, name: p.data.name, termId: p.data.termId, classId: p.data.classId, isDefault: p.data.isDefault ?? false, bands: { create: p.data.bands } }, include: { bands: true } });
    return reply.code(201).send(ok(created));
  });

  app.post('/exam-results', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HOD', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ examId: z.string(), examPaperId: z.string(), studentId: z.string(), marks: z.number() });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', p.error.issues));
    const examCheck = await ensureExamInSchool(app, reply, p.data.examId, jwt.schoolId); if (!examCheck.ok) return examCheck.response;
    const paperCheck = await ensureExamPaperInExam(app, reply, p.data.examPaperId, p.data.examId); if (!paperCheck.ok) return paperCheck.response;
    const studentCheck = await ensureStudentInSchool(app, reply, p.data.studentId, jwt.schoolId); if (!studentCheck.ok) return studentCheck.response;
    const teacherSubjectScope = await ensureTeacherCanAccessSubjectForClass(app, reply, jwt, studentCheck.student.classId, paperCheck.paper.subjectId); if (!teacherSubjectScope.ok) return teacherSubjectScope.response;

    const gradingScale = await app.prisma.gradingScale.findFirst({
      where: { schoolId: jwt.schoolId, OR: [ { classId: studentCheck.student.classId, termId: examCheck.exam.id }, { classId: studentCheck.student.classId }, { isDefault: true } ] }, include: { bands: true }, orderBy: { createdAt: 'desc' }
    });
    const weightedScore = computeWeightedPercentage(p.data.marks, (await app.prisma.examPaper.findUnique({ where: { id: p.data.examPaperId }, select: { maxMarks: true } }))!.maxMarks, (await app.prisma.exam.findUnique({ where: { id: p.data.examId }, select: { weight: true } }))!.weight);
    const gradeData = resolveGrade(p.data.marks, (gradingScale?.bands ?? []).map((b: any) => ({ minScore: b.minScore, maxScore: b.maxScore, grade: b.grade, points: b.points, remark: b.remark })));
    const result = await app.prisma.examResult.upsert({ where: { examPaperId_studentId: { examPaperId: p.data.examPaperId, studentId: p.data.studentId } }, update: { marks: p.data.marks, ...gradeData, weightedScore }, create: { schoolId: jwt.schoolId, ...p.data, ...gradeData, weightedScore } });
    return reply.code(201).send(ok(result));
  });
  app.post('/exams/:id/results', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HOD', 'HEADMASTER'])] }, async (request, reply) => {
    const examId = (request.params as any).id;
    const b = z.object({ examPaperId: z.string(), studentId: z.string(), marks: z.number() }).safeParse(request.body);
    if (!b.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', b.error.issues));
    const payload = { examId, ...b.data };
    const result = await app.prisma.examResult.upsert({ where: { examPaperId_studentId: { examPaperId: payload.examPaperId, studentId: payload.studentId } }, update: { marks: payload.marks }, create: { schoolId: (request.user as any).schoolId, ...payload, weightedScore: payload.marks } });
    return reply.code(201).send(ok(result));
  });

  app.get('/exam-results', { preHandler: [app.authenticate] }, async (request) => {
    const jwt = request.user as any;
    const q = request.query as any;
    const results = await app.prisma.examResult.findMany({ where: { schoolId: jwt.schoolId, ...(q.studentId ? { studentId: q.studentId } : {}), ...(q.examId ? { examId: q.examId } : {}), ...(q.classId ? { student: { classId: q.classId } } : {}) }, include: { student: true, exam: true } });
    return ok(results);
  });
  app.get('/exams/:id/results', { preHandler: [app.authenticate] }, async (request) => {
    const jwt = request.user as any;
    const examId = (request.params as any).id;
    const results = await app.prisma.examResult.findMany({ where: { schoolId: jwt.schoolId, examId }, include: { student: true, exam: true } });
    return ok(results);
  });

  app.get('/exam-results/ranking', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const { classId, examId } = request.query as any;
    if (!classId || !examId) return reply.code(400).send(err('VALIDATION_ERROR', 'classId and examId are required'));
    const rows = await app.prisma.examResult.groupBy({ by: ['studentId'], where: { schoolId: jwt.schoolId, examId, student: { classId } }, _sum: { weightedScore: true } });
    return ok(computePositions(rows.map((r: any) => ({ studentId: r.studentId, total: r._sum.weightedScore ?? 0 }))));
  });

  app.get('/exam-results/report-card', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as any;
    const { studentId, examId } = request.query as any;
    if (!studentId || !examId) return reply.code(400).send(err('VALIDATION_ERROR', 'studentId and examId are required'));
    const results = await app.prisma.examResult.findMany({ where: { schoolId: jwt.schoolId, studentId, examId }, include: { exam: true } });
    const total = results.reduce((acc: number, r: any) => acc + (r.weightedScore ?? 0), 0);
    return ok({ studentId, examId, totalWeightedScore: total, subjects: results, generatedAt: new Date().toISOString() });
  });

  app.post('/exam-results/:id/moderation-transition', { preHandler: [app.authenticate, app.authorize(['HOD', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const id = (request.params as any).id;
    const schema = z.object({ status: z.enum(['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED']) });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', p.error.issues));
    const current = await app.prisma.examResult.findUnique({ where: { id } });
    if (!current || current.schoolId !== jwt.schoolId) return reply.code(404).send(err('NOT_FOUND', 'Exam result not found'));
    const updated = await app.prisma.examResult.update({ where: { id }, data: { moderationStatus: p.data.status, signedOffBy: jwt.userId, signedOffAt: new Date() } });
    return ok(updated);
  });
  app.post('/exams/:id/publish', { preHandler: [app.authenticate, app.authorize(['HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const examId = (request.params as any).id;
    await app.prisma.examResult.updateMany({ where: { schoolId: jwt.schoolId, examId }, data: { moderationStatus: 'APPROVED', signedOffBy: jwt.userId, signedOffAt: new Date() } });
    return ok({ examId, published: true });
  });

  app.get('/exam-timetable', { preHandler: [app.authenticate] }, async (request) => {
    const jwt = request.user as any;
    const { examId } = request.query as any;
    const where = { exam: { schoolId: jwt.schoolId }, ...(examId ? { examId } : {}) };
    const timetable = await app.prisma.examPaper.findMany({ where, include: { subject: true, exam: true }, orderBy: [{ examDate: 'asc' }, { startTime: 'asc' }] });
    return ok(timetable);
  });
}
