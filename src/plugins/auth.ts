import fp from 'fastify-plugin';
import { FastifyReply, FastifyRequest } from 'fastify';
import { JwtUser } from '../types/auth';

export default fp(async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify<JwtUser>();
    } catch {
      reply.code(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
    }
  });

  fastify.decorate('authorize', (roles: string[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const role = (request.user as JwtUser).role;
      if (!roles.includes(role)) {
        return reply.code(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
      }
    };
  });
});
