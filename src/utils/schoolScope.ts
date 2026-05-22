import { FastifyInstance, FastifyReply } from 'fastify';
import { JwtUser } from '../types/auth';
import { fail } from './http';

export const denyCrossSchool = (reply: FastifyReply, resource: string) =>
  reply.code(403).send(fail('FORBIDDEN', `${resource} belongs to another school`));

export const notFound = (reply: FastifyReply, resource: string) =>
  reply.code(404).send(fail('NOT_FOUND', `${resource} not found`));

export async function ensureClassInSchool(app: FastifyInstance, reply: FastifyReply, classId: string, schoolId: string) {
  const klass = await app.prisma.class.findUnique({ where: { id: classId }, select: { id: true, schoolId: true, classTeacherId: true } });
  if (!klass) return { ok: false as const, response: notFound(reply, 'Class') };
  if (klass.schoolId !== schoolId) return { ok: false as const, response: denyCrossSchool(reply, 'Class') };
  return { ok: true as const, klass };
}

export async function ensureStudentInSchool(app: FastifyInstance, reply: FastifyReply, studentId: string, schoolId: string) {
  const student = await app.prisma.student.findUnique({ where: { id: studentId }, select: { id: true, schoolId: true, classId: true } });
  if (!student) return { ok: false as const, response: notFound(reply, 'Student') };
  if (student.schoolId !== schoolId) return { ok: false as const, response: denyCrossSchool(reply, 'Student') };
  return { ok: true as const, student };
}

export async function ensureTermInSchool(app: FastifyInstance, reply: FastifyReply, termId: string, schoolId: string) {
  const term = await app.prisma.term.findUnique({ where: { id: termId }, select: { id: true, schoolId: true } });
  if (!term) return { ok: false as const, response: notFound(reply, 'Term') };
  if (term.schoolId !== schoolId) return { ok: false as const, response: denyCrossSchool(reply, 'Term') };
  return { ok: true as const, term };
}

export async function ensureExamInSchool(app: FastifyInstance, reply: FastifyReply, examId: string, schoolId: string) {
  const exam = await app.prisma.exam.findUnique({ where: { id: examId }, select: { id: true, schoolId: true } });
  if (!exam) return { ok: false as const, response: notFound(reply, 'Exam') };
  if (exam.schoolId !== schoolId) return { ok: false as const, response: denyCrossSchool(reply, 'Exam') };
  return { ok: true as const, exam };
}

export async function ensureExamPaperInExam(app: FastifyInstance, reply: FastifyReply, examPaperId: string, examId: string) {
  const paper = await app.prisma.examPaper.findUnique({ where: { id: examPaperId }, select: { id: true, examId: true, subjectId: true } });
  if (!paper) return { ok: false as const, response: notFound(reply, 'Exam paper') };
  if (paper.examId !== examId) return { ok: false as const, response: denyCrossSchool(reply, 'Exam paper') };
  return { ok: true as const, paper };
}

export async function ensureTeacherCanAccessClass(reply: FastifyReply, jwt: JwtUser, classTeacherId: string | null) {
  if (jwt.role !== 'TEACHER') return { ok: true as const };
  if (classTeacherId !== jwt.userId) return { ok: false as const, response: reply.code(403).send(fail('FORBIDDEN', 'Teachers can only access their own class')) };
  return { ok: true as const };
}

export async function ensureTeacherCanAccessSubjectForClass(app: FastifyInstance, reply: FastifyReply, jwt: JwtUser, classId: string, subjectId: string) {
  if (jwt.role !== 'TEACHER') return { ok: true as const };
  const assignment = await app.prisma.classSubject.findFirst({ where: { schoolId: jwt.schoolId!, classId, subjectId, teacherId: jwt.userId }, select: { id: true } });
  if (!assignment) return { ok: false as const, response: reply.code(403).send(fail('FORBIDDEN', 'Teachers can only submit results for their own subject assignment')) };
  return { ok: true as const };
}
