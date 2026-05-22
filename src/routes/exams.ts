import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { err, ok } from '../utils/http';
import { ensureExamInSchool, ensureExamPaperInExam, ensureStudentInSchool, ensureTeacherCanAccessSubjectForClass, ensureTermInSchool } from '../utils/schoolScope';

export async function examRoutes(app: FastifyInstance) {
  app.post('/exams', { preHandler: [app.authenticate, app.authorize(['SCHOOL_ADMIN', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ termId: z.string(), name: z.string(), startDate: z.string(), endDate: z.string(), weight: z.number().min(0).max(100) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const termCheck = await ensureTermInSchool(app, reply, parsed.data.termId, jwt.schoolId);
    if (!termCheck.ok) return termCheck.response;

    const created = await app.prisma.exam.create({ data: { schoolId: jwt.schoolId, termId: parsed.data.termId, name: parsed.data.name, startDate: new Date(parsed.data.startDate), endDate: new Date(parsed.data.endDate), weight: parsed.data.weight } });
    return reply.code(201).send(ok(created));
  });

  app.post('/exam-results', { preHandler: [app.authenticate, app.authorize(['TEACHER', 'HOD', 'HEADMASTER'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ examId: z.string(), examPaperId: z.string(), studentId: z.string(), marks: z.number() });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', p.error.issues));
    const examCheck = await ensureExamInSchool(app, reply, p.data.examId, jwt.schoolId);
    if (!examCheck.ok) return examCheck.response;

    const paperCheck = await ensureExamPaperInExam(app, reply, p.data.examPaperId, p.data.examId);
    if (!paperCheck.ok) return paperCheck.response;

    const studentCheck = await ensureStudentInSchool(app, reply, p.data.studentId, jwt.schoolId);
    if (!studentCheck.ok) return studentCheck.response;

    const teacherSubjectScope = await ensureTeacherCanAccessSubjectForClass(app, reply, jwt, studentCheck.student.classId, paperCheck.paper.subjectId);
    if (!teacherSubjectScope.ok) return teacherSubjectScope.response;

    const grade = p.data.marks >= 80 ? 'A' : p.data.marks >= 70 ? 'B' : p.data.marks >= 60 ? 'C' : p.data.marks >= 50 ? 'D' : p.data.marks >= 40 ? 'E' : 'U';
    const result = await app.prisma.examResult.upsert({ where: { examPaperId_studentId: { examPaperId: p.data.examPaperId, studentId: p.data.studentId } }, update: { marks: p.data.marks, grade }, create: { schoolId: jwt.schoolId, ...p.data, grade } });
    return reply.code(201).send(ok(result));
  });
}
