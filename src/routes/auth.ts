import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { err, ok } from '../utils/http';
import { generateResetToken, generateTokenId, hashToken, permissionsForRole } from '../utils/authSecurity';

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
    const refreshJti = generateTokenId();
    const refreshToken = app.jwt.sign({ userId: user.id, jti: refreshJti }, { expiresIn: parsed.data.rememberMe ? '30d' : '7d', secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret' } as any);
    await app.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenId: refreshJti,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + (parsed.data.rememberMe ? 30 : 7) * 24 * 60 * 60 * 1000),
      },
    });
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

  app.post('/auth/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const token = (request.cookies as Record<string, string | undefined>)?.edutrack_refresh;
    if (token) {
      await app.prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
    }
    reply.clearCookie('edutrack_refresh', { path: '/' });
    return ok({ message: 'Logged out successfully' });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const token = (request.cookies as Record<string, string | undefined>)?.edutrack_refresh;
    if (!token) return reply.code(401).send(err('UNAUTHORIZED', 'Missing refresh token'));

    try {
      const payload = app.jwt.verify<{ userId: string; jti: string }>(token, { secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret' } as any);
      const tokenRecord = await app.prisma.refreshToken.findUnique({ where: { tokenId: payload.jti } });
      if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date() || tokenRecord.tokenHash !== hashToken(token)) {
        return reply.code(401).send(err('UNAUTHORIZED', 'Invalid refresh token'));
      }

      const user = await app.prisma.user.findUnique({ where: { id: payload.userId } });
      if (!user) return reply.code(401).send(err('UNAUTHORIZED', 'Invalid refresh token'));

      await app.prisma.refreshToken.update({ where: { tokenId: payload.jti }, data: { revokedAt: new Date() } });

      const nextJti = generateTokenId();
      const nextRefreshToken = app.jwt.sign({ userId: user.id, jti: nextJti }, { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret' } as any);
      await app.prisma.refreshToken.create({ data: { userId: user.id, tokenId: nextJti, tokenHash: hashToken(nextRefreshToken), expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      reply.setCookie('edutrack_refresh', nextRefreshToken, { httpOnly: true, path: '/', sameSite: 'lax' });

      const accessToken = app.jwt.sign({ userId: user.id, schoolId: user.schoolId, role: user.role, email: user.email }, { expiresIn: '15m' });
      return ok({ accessToken });
    } catch {
      return reply.code(401).send(err('UNAUTHORIZED', 'Invalid refresh token'));
    }
  });

  app.post('/auth/forgot-password', async (request) => {
    const parsed = forgotPasswordSchema.safeParse(request.body);
    if (!parsed.success) return err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues);

    const user = await app.prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (user) {
      const token = generateResetToken();
      await app.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: token.tokenHash, expiresAt: token.expiresAt } });
      app.log.info({ userId: user.id, resetToken: token.rawToken }, 'Password reset token generated');
    }

    return ok({ message: 'If that email exists, a reset link has been sent.' });
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const parsed = resetPasswordSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', parsed.error.issues));

    const tokenHash = hashToken(parsed.data.token);
    const resetRecord = await app.prisma.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null }, include: { user: true } });
    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      return reply.code(401).send(err('UNAUTHORIZED', 'Invalid or expired reset token'));
    }

    await app.prisma.$transaction([
      app.prisma.user.update({ where: { id: resetRecord.userId }, data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 10) } }),
      app.prisma.passwordResetToken.update({ where: { id: resetRecord.id }, data: { usedAt: new Date() } }),
      app.prisma.passwordResetToken.updateMany({ where: { userId: resetRecord.userId, usedAt: null }, data: { usedAt: new Date() } })
    ]);

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
      permissions: permissionsForRole(user.role)
    });
  });
}
