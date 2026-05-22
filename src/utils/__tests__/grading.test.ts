import test from 'node:test';
import assert from 'node:assert/strict';
import { computePositions, computeWeightedPercentage } from '../grading';

test('computeWeightedPercentage calculates weighted score', () => {
  assert.equal(computeWeightedPercentage(76, 100, 40), 30.4);
  assert.equal(computeWeightedPercentage(50, 80, 20), 12.5);
});

test('computePositions handles ties with same rank and next rank skip', () => {
  const positions = computePositions([
    { studentId: 's1', total: 88 },
    { studentId: 's2', total: 88 },
    { studentId: 's3', total: 75 }
  ]);

  assert.deepEqual(positions.map((p) => ({ studentId: p.studentId, position: p.position })), [
    { studentId: 's1', position: 1 },
    { studentId: 's2', position: 1 },
    { studentId: 's3', position: 3 }
  ]);
});
