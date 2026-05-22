import test from 'node:test';
import assert from 'node:assert/strict';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceService, calculateAttendancePercentage } from './attendanceService';

test('calculateAttendancePercentage handles zero total', () => {
  assert.equal(calculateAttendancePercentage(0, 0), 0);
});

test('calculateAttendancePercentage rounds to 2 decimals', () => {
  assert.equal(calculateAttendancePercentage(3, 2), 66.67);
});

test('class percentage includes boundary dates', async () => {
  const captured: any = {};
  const prisma: any = {
    attendanceRecord: {
      findMany: async (args: any) => {
        captured.where = args.where;
        return [
          { status: AttendanceStatus.PRESENT },
          { status: AttendanceStatus.ABSENT },
          { status: AttendanceStatus.LATE }
        ];
      }
    }
  };
  const service = new AttendanceService(prisma);
  const start = new Date('2026-01-01T00:00:00.000Z');
  const end = new Date('2026-01-31T23:59:59.999Z');
  const stats = await service.getAttendancePercentageByClass('s1', 'c1', start, end);
  assert.deepEqual(captured.where.date, { gte: start, lte: end });
  assert.equal(stats.percentage, 66.67);
});
