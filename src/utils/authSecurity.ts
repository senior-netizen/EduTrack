import crypto from 'crypto';
import { UserRole } from '@prisma/client';

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  return { rawToken, tokenHash, expiresAt };
}

export function hashToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateTokenId() {
  return crypto.randomUUID();
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SUPER_ADMIN: ['*:*'],
  SCHOOL_ADMIN: ['students:read', 'students:write', 'fees:read', 'fees:write', 'attendance:read', 'attendance:write', 'exams:read', 'exams:write', 'academics:read', 'academics:write'],
  HEADMASTER: ['students:read', 'attendance:read', 'attendance:write', 'exams:read', 'academics:read'],
  HOD: ['students:read', 'attendance:read', 'attendance:write', 'exams:read', 'exams:write', 'academics:read'],
  TEACHER: ['students:read', 'attendance:read', 'attendance:write', 'exams:read', 'exams:write'],
  BURSAR: ['students:read', 'fees:read', 'fees:write'],
  LIBRARIAN: ['students:read'],
  PARENT: ['students:read', 'fees:read', 'attendance:read', 'exams:read'],
  STUDENT: ['fees:read', 'attendance:read', 'exams:read']
};

export function permissionsForRole(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? [];
}
