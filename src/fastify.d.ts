import { PrismaClient } from '@prisma/client';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: any;
    authorize: (roles: string[]) => any;
    redisSessionState: {
      getLoginAttempt: (email: string) => Promise<{ attempts: number; lockedUntil: number | null }>;
      setLoginAttempt: (email: string, state: { attempts: number; lockedUntil: number | null }, ttlSeconds: number) => Promise<void>;
      clearLoginAttempt: (email: string) => Promise<void>;
    };
    notificationQueue: any;
    fileStorage: any;
    auditTrail: any;
  }
}
