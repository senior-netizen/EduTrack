import { InvoiceStatus, Prisma } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { created, fail, mapZodIssues, ok } from '../utils/http';
import { ensureStudentInSchool } from '../utils/schoolScope';

const toMoney = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function computeInvoiceState(total: number, paid: number, dueDate: Date): { status: InvoiceStatus; balance: number } {
  const balance = toMoney(total - paid);
  if (balance <= 0) return { status: InvoiceStatus.PAID, balance: 0 };
  if (paid > 0) return { status: InvoiceStatus.PARTIAL, balance };
  if (dueDate < new Date()) return { status: InvoiceStatus.OVERDUE, balance };
  return { status: InvoiceStatus.ISSUED, balance };
}

export function allocatePaymentTargets(
  amount: number,
  invoices: Array<{ id: string; dueDate: Date; balance: number }>,
  targetInvoiceIds?: string[]
) {
  const requested = targetInvoiceIds?.length ? new Set(targetInvoiceIds) : null;
  const ordered = invoices
    .filter((invoice) => invoice.balance > 0 && (!requested || requested.has(invoice.id)))
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  let remaining = toMoney(amount);
  const allocations: Array<{ invoiceId: string; amount: number }> = [];

  for (const invoice of ordered) {
    if (remaining <= 0) break;
    const allocation = Math.min(remaining, invoice.balance);
    if (allocation > 0) {
      const amt = toMoney(allocation);
      allocations.push({ invoiceId: invoice.id, amount: amt });
      remaining = toMoney(remaining - amt);
    }
  }

  return { allocations, overpayment: remaining };
}

export async function feeRoutes(app: FastifyInstance) {
  app.get('/invoices', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const q = z.object({ studentId: z.string().optional(), status: z.nativeEnum(InvoiceStatus).optional() }).safeParse(request.query);
    if (!q.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid query', q.error.issues));
    const invoices = await app.prisma.invoice.findMany({ where: { schoolId: jwt.schoolId, ...q.data }, orderBy: { createdAt: 'desc' } });
    return ok(invoices);
  });

  app.get('/invoices/:id', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const p = z.object({ id: z.string() }).safeParse(request.params);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid params', p.error.issues));
    const invoice = await app.prisma.invoice.findFirst({ where: { id: p.data.id, schoolId: jwt.schoolId }, include: { allocations: true } });
    if (!invoice) return reply.code(404).send(err('NOT_FOUND', 'Invoice not found'));
    return ok(invoice);
  });

  app.post('/invoices', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ studentId: z.string(), subtotal: z.number(), discount: z.number().default(0), dueDate: z.string() });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(p.error.issues)));
    const studentCheck = await ensureStudentInSchool(app, reply, p.data.studentId, jwt.schoolId);
    if (!studentCheck.ok) return studentCheck.response;

    const total = toMoney(p.data.subtotal - p.data.discount);
    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`;
    const invoice = await app.prisma.invoice.create({ data: { schoolId: jwt.schoolId, studentId: p.data.studentId, invoiceNo, subtotal: p.data.subtotal, discount: p.data.discount, total, balance: total, dueDate: new Date(p.data.dueDate), status: InvoiceStatus.ISSUED } });
    return reply.code(201).send(ok(invoice));
  });

  app.patch('/invoices/:id', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const p = z.object({ id: z.string() }).safeParse(request.params);
    const b = z.object({ subtotal: z.number().optional(), discount: z.number().optional(), dueDate: z.string().optional() }).safeParse(request.body);
    if (!p.success || !b.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload'));
    const existing = await app.prisma.invoice.findFirst({ where: { id: p.data.id, schoolId: jwt.schoolId } });
    if (!existing) return reply.code(404).send(err('NOT_FOUND', 'Invoice not found'));
    if (existing.status === InvoiceStatus.PAID) return reply.code(409).send(err('CONFLICT', 'Cannot edit paid invoice'));
    const subtotal = b.data.subtotal ?? existing.subtotal;
    const discount = b.data.discount ?? existing.discount;
    const total = toMoney(subtotal - discount);
    const paidAmount = toMoney(existing.total - existing.balance);
    const state = computeInvoiceState(total, paidAmount, b.data.dueDate ? new Date(b.data.dueDate) : existing.dueDate);
    const invoice = await app.prisma.invoice.update({ where: { id: existing.id }, data: { ...b.data, dueDate: b.data.dueDate ? new Date(b.data.dueDate) : undefined, subtotal, discount, total, balance: state.balance, status: state.status } });
    return ok(invoice);
  });

  app.post('/invoices/:id/transition', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const p = z.object({ id: z.string() }).safeParse(request.params);
    const b = z.object({ status: z.nativeEnum(InvoiceStatus) }).safeParse(request.body);
    if (!p.success || !b.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload'));
    const invoice = await app.prisma.invoice.findFirst({ where: { id: p.data.id, schoolId: jwt.schoolId } });
    if (!invoice) return reply.code(404).send(err('NOT_FOUND', 'Invoice not found'));
    const allowed: Record<InvoiceStatus, InvoiceStatus[]> = {
      DRAFT: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
      ISSUED: [InvoiceStatus.PARTIAL, InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
      PARTIAL: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
      PAID: [],
      OVERDUE: [InvoiceStatus.PARTIAL, InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
      CANCELLED: []
    };
    if (!allowed[invoice.status].includes(b.data.status)) return reply.code(409).send(err('INVALID_TRANSITION', `Cannot transition from ${invoice.status} to ${b.data.status}`));
    const updated = await app.prisma.invoice.update({ where: { id: invoice.id }, data: { status: b.data.status } });
    return ok(updated);
  });

  app.post('/invoices/bulk/term', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const b = z.object({ termId: z.string(), amount: z.number().positive(), dueDate: z.string(), idempotencyKey: z.string().min(8), classId: z.string().optional() }).safeParse(request.body);
    if (!b.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid payload', b.error.issues));

    const existing = await app.prisma.bulkInvoiceRun.findUnique({ where: { schoolId_idempotencyKey: { schoolId: jwt.schoolId, idempotencyKey: b.data.idempotencyKey } } });
    if (existing) return ok({ runId: existing.id, createdCount: existing.createdCount, duplicate: true });

    const term = await app.prisma.term.findFirst({ where: { id: b.data.termId, schoolId: jwt.schoolId } });
    if (!term) return reply.code(404).send(err('NOT_FOUND', 'Term not found'));

    const students = await app.prisma.student.findMany({ where: { schoolId: jwt.schoolId, ...(b.data.classId ? { classId: b.data.classId } : {}) } });
    const run = await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await Promise.all(students.map((s: { id: string }) => tx.invoice.create({ data: { schoolId: jwt.schoolId, studentId: s.id, invoiceNo: `INV-${term.academicYear}-${Math.floor(Math.random() * 1e8).toString().padStart(8, '0')}`, subtotal: b.data.amount, discount: 0, total: b.data.amount, balance: b.data.amount, dueDate: new Date(b.data.dueDate), status: InvoiceStatus.ISSUED, termId: term.id } }))); 
      return tx.bulkInvoiceRun.create({ data: { schoolId: jwt.schoolId, termId: term.id, idempotencyKey: b.data.idempotencyKey, createdCount: created.length } });
    });
    return reply.code(201).send(ok({ runId: run.id, createdCount: run.createdCount, duplicate: false }));
  });

  app.post('/payments', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const schema = z.object({ studentId: z.string(), reference: z.string(), amount: z.number().positive(), method: z.string(), paidAt: z.string(), targetInvoiceIds: z.array(z.string()).optional(), overpaymentPolicy: z.enum(['HOLD_AS_CREDIT', 'REJECT']).default('HOLD_AS_CREDIT') });
    const p = schema.safeParse(request.body);
    if (!p.success) return reply.code(400).send(fail('VALIDATION_ERROR', 'Invalid payload', mapZodIssues(p.error.issues)));
    const studentCheck = await ensureStudentInSchool(app, reply, p.data.studentId, jwt.schoolId);
    if (!studentCheck.ok) return studentCheck.response;

    const result = await app.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const pay = await tx.payment.create({ data: { schoolId: jwt.schoolId, studentId: p.data.studentId, reference: p.data.reference, amount: p.data.amount, method: p.data.method, paidAt: new Date(p.data.paidAt) } });
      const invoices = await tx.invoice.findMany({ where: { schoolId: jwt.schoolId, studentId: p.data.studentId, status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIAL, InvoiceStatus.OVERDUE] } } });
      const allocPlan = allocatePaymentTargets(pay.amount, invoices.map((i: { id: string; dueDate: Date; balance: number }) => ({ id: i.id, dueDate: i.dueDate, balance: i.balance })), p.data.targetInvoiceIds);
      if (allocPlan.overpayment > 0 && p.data.overpaymentPolicy === 'REJECT') throw new Error('OVERPAYMENT_NOT_ALLOWED');

      for (const alloc of allocPlan.allocations) {
        await tx.paymentAllocation.create({ data: { schoolId: jwt.schoolId, paymentId: pay.id, invoiceId: alloc.invoiceId, amount: alloc.amount } });
        const inv = invoices.find((i: { id: string; total: number; balance: number; dueDate: Date }) => i.id === alloc.invoiceId)!;
        const paidAmount = toMoney(inv.total - inv.balance + alloc.amount);
        const state = computeInvoiceState(inv.total, paidAmount, inv.dueDate);
        await tx.invoice.update({ where: { id: inv.id }, data: { balance: state.balance, status: state.status } });
      }

      if (allocPlan.overpayment > 0) {
        await tx.payment.update({ where: { id: pay.id }, data: { unappliedAmount: allocPlan.overpayment } });
      }

      return { pay, allocations: allocPlan.allocations, overpayment: allocPlan.overpayment };
    });

    return reply.code(201).send(ok(result));
  });

  app.post('/payments/:id/receipt', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request, reply) => {
    const jwt = request.user as any;
    const p = z.object({ id: z.string() }).safeParse(request.params);
    if (!p.success) return reply.code(400).send(err('VALIDATION_ERROR', 'Invalid params'));
    const payment = await app.prisma.payment.findFirst({ where: { id: p.data.id, schoolId: jwt.schoolId } });
    if (!payment) return reply.code(404).send(err('NOT_FOUND', 'Payment not found'));
    const existing = await app.prisma.receipt.findUnique({ where: { paymentId: payment.id } });
    if (existing) return ok(existing);
    const receipt = await app.prisma.receipt.create({ data: { schoolId: jwt.schoolId, paymentId: payment.id, receiptNo: `RCPT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1e7).toString().padStart(7, '0')}`, reference: payment.reference } });
    return reply.code(201).send(ok(receipt));
  });

  app.get('/reports/arrears', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request) => {
    const jwt = request.user as any;
    const overdue = await app.prisma.invoice.aggregate({ where: { schoolId: jwt.schoolId, status: InvoiceStatus.OVERDUE }, _sum: { balance: true }, _count: true });
    const partial = await app.prisma.invoice.aggregate({ where: { schoolId: jwt.schoolId, status: InvoiceStatus.PARTIAL }, _sum: { balance: true }, _count: true });
    return ok({ overdueCount: overdue._count, overdueBalance: overdue._sum.balance ?? 0, partialCount: partial._count, partialBalance: partial._sum.balance ?? 0 });
  });

  app.get('/reports/reconciliation', { preHandler: [app.authenticate, app.authorize(['BURSAR', 'SCHOOL_ADMIN'])] }, async (request) => {
    const jwt = request.user as any;
    const payments = await app.prisma.payment.aggregate({ where: { schoolId: jwt.schoolId }, _sum: { amount: true, unappliedAmount: true }, _count: true });
    const allocated = await app.prisma.paymentAllocation.aggregate({ where: { schoolId: jwt.schoolId }, _sum: { amount: true } });
    return ok({ paymentCount: payments._count, totalPayments: payments._sum.amount ?? 0, totalAllocated: allocated._sum.amount ?? 0, unappliedBalance: payments._sum.unappliedAmount ?? 0 });
  });
}
