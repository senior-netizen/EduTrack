import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import jwt from '@fastify/jwt';
import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import { authRoutes } from './routes/auth';
import { studentRoutes } from './routes/students';

const app = Fastify({ logger: true });

app.register(cors, { origin: true, credentials: true });
app.register(cookie);
app.register(jwt, { secret: process.env.JWT_ACCESS_SECRET ?? 'dev-secret' });
app.register(prismaPlugin);
app.register(authPlugin);

app.get('/health', async () => ({ success: true, data: { status: 'ok' } }));
app.register(authRoutes, { prefix: '/api/v1' });
app.register(studentRoutes, { prefix: '/api/v1' });

const port = Number(process.env.PORT ?? 4000);
app.listen({ port, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
