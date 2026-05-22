import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import redisStorePlugin from './plugins/redisStore';
import jobQueuePlugin from './plugins/jobQueue';
import storagePlugin from './plugins/storage';
import auditPlugin from './plugins/audit';
import { authRoutes } from './routes/auth';
import { studentRoutes } from './routes/students';
import { schoolRoutes } from './routes/schools';
import { academicRoutes } from './routes/academics';
import { attendanceRoutes } from './routes/attendance';
import { examRoutes } from './routes/exams';
import { feeRoutes } from './routes/fees';
import { platformRoutes } from './routes/platform';

export async function buildApp() {
  const app = Fastify({ logger: true });
  app.register(cors, { origin: true, credentials: true });
  app.register(cookie);
  app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret' });
  app.register(prismaPlugin);
  app.register(authPlugin);
  app.register(redisStorePlugin);
  app.register(jobQueuePlugin);
  app.register(storagePlugin);
  app.register(auditPlugin);

  app.get('/health', async () => ({ success: true, data: { status: 'ok' } }));
  app.register(authRoutes, { prefix: '/api/v1' });
  app.register(schoolRoutes, { prefix: '/api/v1' });
  app.register(studentRoutes, { prefix: '/api/v1' });
  app.register(academicRoutes, { prefix: '/api/v1' });
  app.register(attendanceRoutes, { prefix: '/api/v1' });
  app.register(examRoutes, { prefix: '/api/v1' });
  app.register(feeRoutes, { prefix: '/api/v1' });
  app.register(platformRoutes, { prefix: '/api/v1' });
  return app;
}

if (require.main === module) {
  buildApp().then((app) => {
    const port = Number(process.env.PORT ?? 4000);
    app.listen({ port, host: '0.0.0.0' }).catch((err) => {
      app.log.error(err);
      process.exit(1);
    });
  });
}
