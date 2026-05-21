import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const schema = z.object({ email: z.string().email(), password: z.string().min(8), rememberMe: z.boolean().optional() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parsed.error.issues } });

    const user = await app.prisma.user.findUnique({ where: { email: parsed.data.email }, include: { school: true } });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } });
    }

    const accessToken = app.jwt.sign({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email }, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign({ userId: user.id }, { expiresIn: parsed.data.rememberMe ? '30d' : '7d' });

    reply.setCookie('edutrack_refresh', refreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });
    return {
      success: true,
      data: { accessToken, user: { id: user.id, email: user.email, role: user.role, schoolId: user.schoolId, schoolName: user.school?.name, firstName: user.firstName, lastName: user.lastName } }
    };
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request) => {
    const jwt = request.user as any;
    const user = await app.prisma.user.findUnique({ where: { id: jwt.userId } });
    return { success: true, data: user };
  });
}
