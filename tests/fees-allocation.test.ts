import test from 'node:test';
import assert from 'node:assert/strict';
import { allocatePaymentTargets } from '../src/routes/fees';

test('allocates oldest balances first', () => {
  const res = allocatePaymentTargets(120, [
    { id: 'i2', dueDate: new Date('2026-03-01'), balance: 100 },
    { id: 'i1', dueDate: new Date('2026-02-01'), balance: 50 }
  ]);
  assert.deepEqual(res.allocations, [
    { invoiceId: 'i1', amount: 50 },
    { invoiceId: 'i2', amount: 70 }
  ]);
  assert.equal(res.overpayment, 0);
});

test('supports target invoice list and overpayment remainder', () => {
  const res = allocatePaymentTargets(200, [
    { id: 'i1', dueDate: new Date('2026-01-01'), balance: 30 },
    { id: 'i2', dueDate: new Date('2026-01-02'), balance: 50 }
  ], ['i2']);
  assert.deepEqual(res.allocations, [{ invoiceId: 'i2', amount: 50 }]);
  assert.equal(res.overpayment, 150);
});
