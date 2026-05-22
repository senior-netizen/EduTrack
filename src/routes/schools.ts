import { randomBytes } from 'crypto';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { JwtUser } from '../types/auth';
import { err, ok } from '../utils/http';

const schoolResponseSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  code: z.string(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  country: z.string(),
  currency: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  stats: z.object({
    students: z.number(),
    activeStudents: z.number(),
    classes: z.number(),
    teachers: z.number()
  }),
  activeTerm: z.object({
    id: z.string(),
    academicYear: z.string(),
    name: z.string(),
    startDate: z.date(),
    endDate: z.date()
  }).nullable()
});

type SchoolWithActiveTerm = Awaited<ReturnType<FastifyInstance['prisma']['school']['findUnique']>> & {
  terms?: Array<{ id: string; academicYear: string; name: string; startDate: Date; endDate: Date }>;
};

export async function getSchoolResponseDto(app: FastifyInstance, schoolId: string) {
  const school = await app.prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      terms: {
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
        take: 1,
        select: { id: true, academicYear: true, name: true, startDate: true, endDate: true }
      }
    }
  }) as SchoolWithActiveTerm | null;

  if (!school) return null;

  const [students, activeStudents, classes, teachers] = await Promise.all([
    app.prisma.student.aggregate({ where: { schoolId }, _count: { _all: true } }),
    app.prisma.student.aggregate({ where: { schoolId, status: 'ACTIVE' }, _count: { _all: true } }),
    app.prisma.class.aggregate({ where: { schoolId }, _count: { _all: true } }),
    app.prisma.user.aggregate({ where: { schoolId, role: 'TEACHER', isActive: true }, _count: { _all: true } })
  ]);

  return schoolResponseSchema.parse({
    id: school.id,
    name: school.name,
    code: school.code,
    address: school.address,
    phone: school.phone,
    email: school.email,
    country: school.country,
    currency: school.currency,
    isActive: school.isActive,
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
    stats: {
      students: students._count._all,
      activeStudents: activeStudents._count._all,
      classes: classes._count._all,
      teachers: teachers._count._all
    },
    activeTerm: school.terms?.[0] ?? null
  });
}

function isPrivilegedRole(role: UserRole) {
  return role === 'SUPER_ADMIN';
}

function isOwnSchoolRole(role: UserRole) {
  return role === 'SCHOOL_ADMIN' || role === 'HEADMASTER' || role === 'HOD' || role === 'BURSAR' || role === 'LIBRARIAN' || role === 'TEACHER';
}

export function resolveSchoolIdForRequest(jwt: JwtUser, explicitSchoolId?: string) {
  if (explicitSchoolId) {
    if (isPrivilegedRole(jwt.role)) return explicitSchoolId;
    if (jwt.schoolId === explicitSchoolId && isOwnSchoolRole(jwt.role)) return explicitSchoolId;
    return null;
  }

  if (isOwnSchoolRole(jwt.role) && jwt.schoolId) return jwt.schoolId;
  return null;
}

export async function schoolRoutes(app: FastifyInstance) {
  app.post('/schools', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN'])] }, async (request, reply) => {
    const schema = z.object({ name: z.string().min(2), code: z.string().min(2), address: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional(), country: z.string().default('ZW'), currency: z.string().default('USD'), adminEmail: z.string().email(), adminFirstName: z.string(), adminLastName: z.string() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));
    const data = parsed.data;

    const temporaryPassword = randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const { school, admin } = await app.prisma.$transaction(async (tx: any) => {
      const createdSchool = await tx.school.create({
        data: { name: data.name, code: data.code, address: data.address, phone: data.phone, email: data.email, country: data.country, currency: data.currency }
      });

      const createdAdmin = await tx.user.create({
        data: {
          schoolId: createdSchool.id,
          email: data.adminEmail,
          firstName: data.adminFirstName,
          lastName: data.adminLastName,
          role: 'SCHOOL_ADMIN',
          passwordHash
        }
      });

      return { school: createdSchool, admin: createdAdmin };
    });

    return reply.code(201).send(ok({
      ...school,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        schoolId: admin.schoolId,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      }
    }));
  });

  app.get('/schools/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as JwtUser;
    const { id } = request.params as { id: string };
    const schoolId = resolveSchoolIdForRequest(jwt, id);
    if (!schoolId) return reply.code(403).send(err('FORBIDDEN', 'Insufficient permissions'));

    const school = await getSchoolResponseDto(app, schoolId);
    if (!school) return reply.code(404).send(err('NOT_FOUND', 'School not found'));
    return ok(school);
  });

  app.get('/schools/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const jwt = request.user as JwtUser;
    const schoolId = resolveSchoolIdForRequest(jwt);
    if (!schoolId) return reply.code(403).send(err('FORBIDDEN', 'Insufficient permissions'));

    const school = await getSchoolResponseDto(app, schoolId);
    if (!school) return reply.code(404).send(err('NOT_FOUND', 'School not found'));
    return ok(school);
  });
}
