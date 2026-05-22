import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { err, ok } from '../utils/http';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
});

const forgotPasswordSchema = z.object({ email: z.string().email() });
const resetPasswordSchema = z.object({ token: z.string().min(1), newPassword: z.string().min(8) });

const MAX_LOGIN_ATTEMPTS = 10;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));

    const user = await app.prisma.user.findUnique({ where: { email: parsed.data.email }, include: { school: true } });
    if (!user) return reply.code(401).send(err('UNAUTHORIZED', 'Invalid email or password'));

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return reply.code(429).send(err('RATE_LIMITED', 'Too many failed login attempts. Try again later.'));
    }

    const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!passwordValid) {
      const nextFailedAttempts = user.failedLoginAttempts + 1;
      const lockAccount = nextFailedAttempts >= MAX_LOGIN_ATTEMPTS;

      await app.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: lockAccount ? 0 : nextFailedAttempts,
          lockedUntil: lockAccount ? new Date(Date.now() + LOCKOUT_WINDOW_MS) : null,
        },
      });

      return reply.code(401).send(err('UNAUTHORIZED', 'Invalid email or password'));
    }

    await app.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    const accessToken = app.jwt.sign({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email }, { expiresIn: '15m' });
    const refreshToken = app.jwt.sign({ userId: user.id }, { expiresIn: parsed.data.rememberMe ? '30d' : '7d' });
    reply.setCookie('edutrack_refresh', refreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });

    return ok({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        schoolId: user.schoolId,
        schoolName: user.school?.name,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: null
      }
    });
  });

  app.post('/auth/logout', { preHandler: [app.authenticate] }, async (_, reply) => {
    reply.clearCookie('edutrack_refresh', { path: '/' });
    return ok({ message: 'Logged out successfully' });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const token = (request.cookies as Record<string, string | undefined>)?.edutrack_refresh;
    if (!token) return reply.code(401).send(err('UNAUTHORIZED', 'Missing refresh token'));

    try {
      const payload = app.jwt.verify<{ userId: string }>(token);
      const user = await app.prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return reply.code(401).send(err('UNAUTHORIZED', 'Invalid refresh token'));

      const accessToken = app.jwt.sign({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email }, { expiresIn: '15m' });
      return ok({ accessToken });
    } catch {
      return reply.code(401).send(err('UNAUTHORIZED', 'Invalid refresh token'));
    }
  });

  app.post('/auth/forgot-password', async (request) => {
    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues);

    return ok({ message: 'If that email exists, a reset link has been sent.' });
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const schema = z.object({ token: z.string().min(1), newPassword: z.string().min(8) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));

    return ok({ message: 'Password reset successfully.' });
  });

  app.get('/auth/me', { preHandler: [app.authenticate, app.authorize(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEADMASTER', 'HOD', 'TEACHER', 'BURSAR', 'LIBRARIAN', 'PARENT', 'STUDENT'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const user = await app.prisma.user.findUnique({ where: { id: jwt.userId }, include: { school: true } });
    if (!user) return reply.code(404).send(err('NOT_FOUND', 'User not found'));

    return ok({
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      schoolName: user.school?.name,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: null,
      lastLogin: user.lastLogin,
      permissions: []
    });
  });
}
