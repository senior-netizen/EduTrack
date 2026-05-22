import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { created, fail, mapZodIssues, ok } from '../utils/http';
import { ensureClassInSchool } from '../utils/schoolScope';

const studentReadRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER', 'HOD', 'TEACHER', 'BURSAR'] as const;
const studentWriteRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER'] as const;

export async function studentRoutes(app: FastifyInstance) {
  app.get('/students', { preHandler: [app.authenticate, app.authorize([...studentReadRoles])] }, async (request) => {
    const q = request.query as any;
    const page = Number(q.page ?? 1);
    const perPage = Math.min(Number(q.perPage ?? 25), 100);
    const jwt = request.user as any;

    const where: any = { schoolId: jwt.schoolId };
    if (q.search) where.OR = [{ firstName: { contains: q.search } }, { lastName: { contains: q.search } }, { studentId: { contains: q.search } }];
    if (q.status) where.status = q.status;
    if (q.classId) where.classId = q.classId;
    if (q.gender) where.gender = q.gender;

    const [rows, total] = await Promise.all([
      app.prisma.student.findMany({ where, include: { guardians: true, class: true }, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' } }),
      app.prisma.student.count({ where })
    ]);

    return ok(rows.map((s: any) => ({
      id: s.id,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      dateOfBirth: s.dateOfBirth.toISOString().slice(0, 10),
      gender: s.gender,
      photoUrl: null,
      status: s.status,
      currentClass: { id: s.class.id, name: s.class.name, grade: s.class.grade, stream: s.class.stream },
      primaryGuardian: s.guardians[0]
        ? { name: s.guardians[0].guardianName, phone: s.guardians[0].guardianPhone, relationship: s.guardians[0].relationship }
        : null,
      feeBalance: 0,
      feeStatus: 'UNKNOWN',
      enrollmentDate: s.createdAt.toISOString().slice(0, 10)
    })), { page, perPage, total, totalPages: Math.ceil(total / perPage) });
  });

  app.post('/students', { preHandler: [app.authenticate, app.authorize([...studentWriteRoles])] }, async (request, reply) => {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      dateOfBirth: z.string(),
      gender: z.string().min(1),
      address: z.string().optional(),
      medicalNotes: z.string().optional(),
      classId: z.string().min(1),
      enrollmentDate: z.string().optional(),
      guardians: z.array(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        relationship: z.string().optional(),
        phone: z.string().min(5),
        email: z.string().email().optional(),
        isPrimary: z.boolean().optional()
      })).min(1)
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));

    const jwt = request.user as any;
    const classCheck = await ensureClassInSchool(app, reply, parsed.data.classId, jwt.schoolId);
    if (!classCheck.ok) return classCheck.response;

    const year = new Date().getFullYear();
    const count = await app.prisma.student.count({ where: { schoolId: jwt.schoolId } });
    const studentId = `SCH-${year}-${String(count + 1).padStart(4, '0')}`;

    const created = await app.prisma.student.create({
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        dateOfBirth: new Date(parsed.data.dateOfBirth),
        gender: parsed.data.gender,
        classId: parsed.data.classId,
        schoolId: jwt.schoolId,
        studentId,
        status: 'ACTIVE',
        guardians: {
          create: parsed.data.guardians.map((g: any) => ({
            guardianName: `${g.firstName} ${g.lastName}`,
            guardianPhone: g.phone,
            relationship: g.relationship
          }))
        }
      },
      include: { class: true }
    });
    return reply.code(201).send(created({
      id: created.id,
      studentId: created.studentId,
      firstName: created.firstName,
      lastName: created.lastName,
      status: created.status,
      currentClass: { id: created.class.id, name: created.class.name },
      createdAt: created.createdAt
    }));
  });

  app.get('/students/:id', { preHandler: [app.authenticate, app.authorize([...studentReadRoles])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const jwt = request.user as any;
    const s = await app.prisma.student.findFirst({ where: { id, schoolId: jwt.schoolId }, include: { guardians: true, class: true } });
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'Student not found'));

    return ok({
      id: s.id,
      studentId: s.studentId,
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      dateOfBirth: s.dateOfBirth.toISOString().slice(0, 10),
      gender: s.gender,
      photoUrl: null,
      address: null,
      medicalNotes: null,
      status: s.status,
      enrollmentDate: s.createdAt.toISOString().slice(0, 10),
      currentClass: { id: s.class.id, name: s.class.name, classTeacher: null },
      guardians: s.guardians.map((g: any) => ({ id: g.id, firstName: g.guardianName.split(' ')[0], lastName: g.guardianName.split(' ').slice(1).join(' '), relationship: g.relationship, phone: g.guardianPhone, email: null, isPrimary: false, hasPortalAccess: false })),
      classHistory: [],
      documents: [],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    });
  });

  app.put('/students/:id', { preHandler: [app.authenticate, app.authorize([...studentWriteRoles])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const jwt = request.user as any;

    const s = await app.prisma.student.findFirst({ where: { id, schoolId: jwt.schoolId } });
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'Student not found'));

    const updated = await app.prisma.student.update({
      where: { id: s.id },
      data: {
        firstName: typeof body.firstName === 'string' ? body.firstName : undefined,
        lastName: typeof body.lastName === 'string' ? body.lastName : undefined,
        gender: typeof body.gender === 'string' ? body.gender : undefined,
        dateOfBirth: typeof body.dateOfBirth === 'string' ? new Date(body.dateOfBirth) : undefined,
        classId: typeof body.classId === 'string' ? body.classId : undefined
      },
      include: { guardians: true, class: true }
    });
    return ok(updated);
  });

  app.post('/students/:id/status', { preHandler: [app.authenticate, app.authorize([...studentWriteRoles])] }, async (request, reply) => {
    const schema = z.object({ status: z.enum(['ACTIVE','SUSPENDED','TRANSFERRED','WITHDRAWN','GRADUATED']), reason: z.string().optional(), effectiveDate: z.string().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));

    const { id } = request.params as { id: string };
    const jwt = request.user as any;
    const s = await app.prisma.student.findFirst({ where: { id, schoolId: jwt.schoolId } });
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'Student not found'));

    const updated = await app.prisma.student.update({ where: { id: s.id }, data: { status: parsed.data.status } });
    return ok({ id: updated.id, status: updated.status, transferLetterUrl: updated.status === 'TRANSFERRED' ? `https://example.invalid/transfer-letter-${updated.studentId}.pdf` : null });
  });
}
