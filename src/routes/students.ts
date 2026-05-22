import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { created, fail, mapZodIssues, ok } from '../utils/http';
import { ensureClassInSchool } from '../utils/schoolScope';

const studentReadRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER', 'HOD', 'TEACHER', 'BURSAR'] as const;
const studentWriteRoles = ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER'] as const;

const updateStudentSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  gender: z.string().min(1).optional(),
  dateOfBirth: z.string().optional(),
  classId: z.string().min(1).optional()
}).strict();

const guardianInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  relationship: z.string().optional(),
  phone: z.string().min(5),
  email: z.string().email().optional(),
  isPrimary: z.boolean().optional(),
  hasPortalAccess: z.boolean().optional()
});

const createStudentSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string(),
  gender: z.string().min(1),
  address: z.string().optional(),
  medicalNotes: z.string().optional(),
  classId: z.string().min(1),
  enrollmentDate: z.string().optional(),
  guardians: z.array(guardianInputSchema).min(1)
});

function computeFeeStatus(balance: number): 'PAID' | 'PARTIAL' | 'OVERDUE' {
  if (balance <= 0) return 'PAID';
  if (balance < 0.01) return 'PAID';
  return 'OVERDUE';
}

function mapGuardian(g: any) {
  return {
    id: g.id,
    firstName: g.firstName,
    lastName: g.lastName,
    relationship: g.relationship,
    phone: g.guardianPhone,
    email: g.email,
    isPrimary: g.isPrimary,
    hasPortalAccess: g.hasPortalAccess
  };
}

export async function studentRoutes(app: FastifyInstance) {
  app.get('/students', { preHandler: [app.authenticate, app.authorize([...studentReadRoles])] }, async (request, reply) => {
    const q = request.query as any;
    const page = Number(q.page ?? 1);
    const perPage = Math.min(Number(q.perPage ?? 25), 100);
    const jwt = request.user as any;

    const where: any = { schoolId: jwt.schoolId };
    if (q.search) where.OR = [{ firstName: { contains: q.search } }, { lastName: { contains: q.search } }, { studentId: { contains: q.search } }];
    if (q.status) where.status = q.status;
    if (q.classId) where.classId = q.classId;
    if (q.gender) where.gender = q.gender;

    if (q.termId) {
      const term = await app.prisma.term.findFirst({ where: { id: q.termId, schoolId: jwt.schoolId } });
      if (!term) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid termId'));
      where.invoices = { some: { dueDate: { gte: term.startDate, lte: term.endDate } } };
    }

    const [rows, total] = await Promise.all([
      app.prisma.student.findMany({ where, include: { guardians: true, class: true }, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' } }),
      app.prisma.student.count({ where })
    ]);

    const studentIds = rows.map((s: any) => s.id);
    const [invoiceAgg, paymentAgg] = await Promise.all([
      app.prisma.invoice.groupBy({ by: ['studentId'], where: { schoolId: jwt.schoolId, studentId: { in: studentIds } }, _sum: { total: true } }),
      app.prisma.payment.groupBy({ by: ['studentId'], where: { schoolId: jwt.schoolId, studentId: { in: studentIds } }, _sum: { amount: true } })
    ]);

    const invoiceTotals = new Map(invoiceAgg.map((i: any) => [i.studentId, i._sum.total ?? 0]));
    const paymentTotals = new Map(paymentAgg.map((p: any) => [p.studentId, p._sum.amount ?? 0]));

    const mapped = rows.map((s: any) => {
      const feeBalance = Number(invoiceTotals.get(s.id) ?? 0) - Number(paymentTotals.get(s.id) ?? 0);
      const feeStatus = computeFeeStatus(feeBalance);
      return {
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
        primaryGuardian: s.guardians.find((g: any) => g.isPrimary) ? mapGuardian(s.guardians.find((g: any) => g.isPrimary)) : (s.guardians[0] ? mapGuardian(s.guardians[0]) : null),
        feeBalance,
        feeStatus,
        enrollmentDate: s.createdAt.toISOString().slice(0, 10)
      };
    }).filter((s: any) => !q.feeStatus || s.feeStatus === q.feeStatus);

    return ok(mapped, { page, perPage, total: q.feeStatus ? mapped.length : total, totalPages: Math.ceil((q.feeStatus ? mapped.length : total) / perPage) });
  });

  app.post('/students', { preHandler: [app.authenticate, app.authorize([...studentWriteRoles])] }, async (request, reply) => {
    const parsed = createStudentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));

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
            firstName: g.firstName,
            lastName: g.lastName,
            guardianName: `${g.firstName} ${g.lastName}`,
            guardianPhone: g.phone,
            relationship: g.relationship,
            email: g.email,
            isPrimary: g.isPrimary ?? false,
            hasPortalAccess: g.hasPortalAccess ?? false
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
      address: s.address,
      medicalNotes: s.medicalNotes,
      status: s.status,
      enrollmentDate: s.createdAt.toISOString().slice(0, 10),
      currentClass: { id: s.class.id, name: s.class.name, classTeacher: null },
      guardians: s.guardians.map((g: any) => mapGuardian(g)),
      classHistory: s.classHistory,
      documents: s.documents,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    });
  });

  app.put('/students/:id', { preHandler: [app.authenticate, app.authorize([...studentWriteRoles])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateStudentSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const body = parsed.data;
    const jwt = request.user as any;

    const s = await app.prisma.student.findFirst({ where: { id, schoolId: jwt.schoolId } });
    if (!s) return reply.code(404).send(fail('NOT_FOUND', 'Student not found'));

    if (body.classId) {
      const classCheck = await ensureClassInSchool(app, reply, body.classId, jwt.schoolId);
      if (!classCheck.ok) return classCheck.response;
    }

    const updated = await app.prisma.student.update({
      where: { id: s.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
        classId: body.classId
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

  app.post('/students/bulk-import', { preHandler: [app.authenticate, app.authorize([...studentWriteRoles])] }, async (request, reply) => {
    const schema = z.object({ students: z.array(createStudentSchema).min(1) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(parsed.error.issues)));
    const jwt = request.user as any;

    const classIds = [...new Set(parsed.data.students.map((s) => s.classId))];
    for (const classId of classIds) {
      const classCheck = await ensureClassInSchool(app, reply, classId, jwt.schoolId);
      if (!classCheck.ok) return classCheck.response;
    }

    const year = new Date().getFullYear();
    const baseCount = await app.prisma.student.count({ where: { schoolId: jwt.schoolId } });
    const createdStudents = await app.prisma.$transaction(parsed.data.students.map((item, index) => app.prisma.student.create({
      data: {
        firstName: item.firstName,
        lastName: item.lastName,
        dateOfBirth: new Date(item.dateOfBirth),
        gender: item.gender,
        address: item.address,
        medicalNotes: item.medicalNotes,
        classId: item.classId,
        schoolId: jwt.schoolId,
        studentId: `SCH-${year}-${String(baseCount + index + 1).padStart(4, '0')}`,
        status: 'ACTIVE',
        guardians: { create: item.guardians.map((g) => ({ firstName: g.firstName, lastName: g.lastName, guardianName: `${g.firstName} ${g.lastName}`, guardianPhone: g.phone, relationship: g.relationship, email: g.email, isPrimary: g.isPrimary ?? false, hasPortalAccess: g.hasPortalAccess ?? false })) }
      }
    })));
    return reply.code(201).send(created({ imported: createdStudents.length, studentIds: createdStudents.map((s) => s.id) }));
  });

  app.get('/students/:id/report-card/:termId', { preHandler: [app.authenticate, app.authorize([...studentReadRoles])] }, async (request, reply) => {
    const jwt = request.user as any;
    const { id, termId } = request.params as { id: string; termId: string };
    const student = await app.prisma.student.findFirst({ where: { id, schoolId: jwt.schoolId }, select: { id: true } });
    if (!student) return reply.code(404).send(fail('NOT_FOUND', 'Student not found'));
    const term = await app.prisma.term.findFirst({ where: { id: termId, schoolId: jwt.schoolId }, select: { id: true } });
    if (!term) return reply.code(404).send(fail('NOT_FOUND', 'Term not found'));
    const results = await app.prisma.examResult.findMany({ where: { schoolId: jwt.schoolId, studentId: id, exam: { termId } }, include: { exam: true, examPaper: true } });
    const total = results.reduce((acc, r) => acc + Number(r.weightedScore ?? 0), 0);
    return ok({ studentId: id, termId, totalWeightedScore: total, subjects: results, generatedAt: new Date().toISOString() });
  });
}
