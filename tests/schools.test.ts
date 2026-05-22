import test from 'node:test';
import assert from 'node:assert/strict';
import { getSchoolResponseDto, resolveSchoolIdForRequest } from '../src/routes/schools';

test('resolveSchoolIdForRequest role matrix', () => {
  const admin = { userId: 'u1', email: 'a@b.com', role: 'SCHOOL_ADMIN' as const, schoolId: 's1' };
  const superAdmin = { userId: 'u2', email: 'x@y.com', role: 'SUPER_ADMIN' as const, schoolId: null };
  const parent = { userId: 'u3', email: 'p@y.com', role: 'PARENT' as const, schoolId: 's1' };

  assert.equal(resolveSchoolIdForRequest(admin), 's1');
  assert.equal(resolveSchoolIdForRequest(admin, 's1'), 's1');
  assert.equal(resolveSchoolIdForRequest(admin, 's2'), null);
  assert.equal(resolveSchoolIdForRequest(superAdmin, 's2'), 's2');
  assert.equal(resolveSchoolIdForRequest(superAdmin), null);
  assert.equal(resolveSchoolIdForRequest(parent), null);
});

test('getSchoolResponseDto includes aggregate fields and active term', async () => {
  const app: any = {
    prisma: {
      school: {
        findUnique: async () => ({
          id: 's1', name: 'Alpha', code: 'A1', address: null, phone: null, email: null, country: 'ZW', currency: 'USD', isActive: true,
          createdAt: new Date('2026-01-01T00:00:00Z'),
          updatedAt: new Date('2026-01-02T00:00:00Z'),
          terms: [{ id: 't1', academicYear: '2026', name: 'Term 1', startDate: new Date('2026-01-10'), endDate: new Date('2026-04-10') }]
        })
      },
      student: { aggregate: async ({ where }: any) => ({ _count: { _all: where.status === 'ACTIVE' ? 80 : 100 } }) },
      class: { aggregate: async () => ({ _count: { _all: 12 } }) },
      user: { aggregate: async () => ({ _count: { _all: 25 } }) }
    }
  };

  const dto = await getSchoolResponseDto(app, 's1');
  assert.ok(dto);
  assert.deepEqual(dto?.stats, { students: 100, activeStudents: 80, classes: 12, teachers: 25 });
  assert.equal(dto?.activeTerm?.id, 't1');
});
