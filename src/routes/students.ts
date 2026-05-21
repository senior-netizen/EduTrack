import { FastifyInstance } from 'fastify';
import { StudentStatus } from '@prisma/client';
import { z } from 'zod';

export async function studentRoutes(app: FastifyInstance) {
  app.get('/students', { preHandler: [app.authenticate] }, async (request) => {
    const q = request.query as any;
    const page = Number(q.page ?? 1);
    const perPage = Math.min(Number(q.perPage ?? 25), 100);
    const jwt = request.user as any;

    const where: any = { schoolId: jwt.schoolId };
    if (q.search) where.OR = [{ firstName: { contains: q.search } }, { lastName: { contains: q.search } }, { studentId: { contains: q.search } }];
    if (q.status) where.status = q.status;

    const [rows, total] = await Promise.all([
      app.prisma.student.findMany({ where, skip: (page - 1) * perPage, take: perPage, orderBy: { createdAt: 'desc' } }),
      app.prisma.student.count({ where })
    ]);

    return { success: true, data: rows, meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) } };
  });

  app.post('/students', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER'])] }, async (request, reply) => {
    const schema = z.object({
      firstName: z.string().min(1),
      lastName: z.string().min(1),
      dateOfBirth: z.string(),
      gender: z.string().min(1),
      className: z.string().min(1),
      guardianName: z.string().min(1),
      guardianPhone: z.string().min(5)
    });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.issues } });

    const jwt = request.user as any;
    const year = new Date().getFullYear();
    const count = await app.prisma.student.count({ where: { schoolId: jwt.schoolId } });
    const studentId = `SCH-${year}-${String(count + 1).padStart(4, '0')}`;

    const created = await app.prisma.student.create({
      data: { ...parsed.data, dateOfBirth: new Date(parsed.data.dateOfBirth), schoolId: jwt.schoolId, studentId, status: StudentStatus.ACTIVE }
    });
    return reply.code(201).send({ success: true, data: created });
  });
}
