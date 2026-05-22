import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import { authRoutes } from './routes/auth';
import { studentRoutes } from './routes/students';
import { schoolRoutes } from './routes/schools';
import { academicRoutes } from './routes/academics';
import { attendanceRoutes } from './routes/attendance';
import { examRoutes } from './routes/exams';
import { feeRoutes } from './routes/fees';
import { fail, mapZodIssues } from './utils/http';

export function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true, credentials: true });
  app.register(cookie);
  app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret' });
  app.register(prismaPlugin);
  app.register(authPlugin);

  app.setErrorHandler((error, _request, reply) => {
    if ((error as any).validation) {
      return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues((error as any).validation)));
    }
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return reply.code(409).send(fail('CONFLICT', 'Unique constraint violation'));
      if (error.code === 'P2025') return reply.code(404).send(fail('NOT_FOUND', 'Resource not found'));
      return reply.code(400).send(fail('DB_ERROR', error.message));
    }
    if ((error as any).statusCode === 401) return reply.code(401).send(fail('UNAUTHORIZED', 'Unauthorized'));
    app.log.error(error);
    return reply.code(500).send(fail('INTERNAL_ERROR', 'An unexpected error occurred'));
  });

  app.get('/health', async () => ({ success: true, data: { status: 'ok' } }));
  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(schoolRoutes, { prefix: '/api/v1' });
  app.register(studentRoutes, { prefix: '/api/v1' });
  app.register(academicRoutes, { prefix: '/api/v1' });
  app.register(attendanceRoutes, { prefix: '/api/v1' });
  app.register(examRoutes, { prefix: '/api/v1' });
  app.register(feeRoutes, { prefix: '/api/v1' });
  return app;
}
