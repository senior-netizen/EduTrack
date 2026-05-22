import { randomBytes } from 'crypto';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { err, ok } from '../utils/http';

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
    const { id } = request.params as { id: string };
    const school = await app.prisma.school.findUnique({ where: { id } });
    if (!school) return reply.code(404).send(err('NOT_FOUND', 'School not found'));
    return ok(school);
  });
}
