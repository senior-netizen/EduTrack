import fp from 'fastify-plugin';

type AuditRecord = {
  id: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

class AuditTrail {
  private events: AuditRecord[] = [];

  capture(input: Omit<AuditRecord, 'id' | 'createdAt'>) {
    const event: AuditRecord = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.events.unshift(event);
    return event;
  }

  list(limit = 100) {
    return this.events.slice(0, limit);
  }
}

export default fp(async (fastify) => {
  fastify.decorate('auditTrail', new AuditTrail());
});
