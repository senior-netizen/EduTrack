import { InvoiceStatus } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { err, ok } from '../utils/http';

export async function feeRoutes(app: FastifyInstance) {
  app.post('/invoices', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ studentId: z.string(), subtotal: z.number(), discount: z.number().default(0), dueDate: z.string() });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', p.error.issues));
    const total = p.data.subtotal - p.data.discount;
    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
    const invoice = await app.prisma.invoice.create({ data: { schoolId: jwt.schoolId, studentId: p.data.studentId, invoiceNo, subtotal: p.data.subtotal, discount: p.data.discount, total, dueDate: new Date(p.data.dueDate), status: InvoiceStatus.ISSUED } });
    return reply.code(201).send(ok(invoice));
  });

  app.post('/payments', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ studentId: z.string(), reference: z.string(), amount: z.number().positive(), method: z.string(), paidAt: z.string() });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', p.error.issues));
    const pay = await app.prisma.payment.create({ data: { schoolId: jwt.schoolId, ...p.data, paidAt: new Date(p.data.paidAt) } });
    return reply.code(201).send(ok(pay));
  });
}
