export type ScaleBand = { minScore: number; maxScore: number; grade: string; points?: number | null; remark?: string | null };

export function computeWeightedPercentage(marks: number, maxMarks: number, examWeight: number) {
  if (maxMarks <= 0) return 0;
  const normalized = (marks / maxMarks) * 100;
  return Number(((normalized * examWeight) / 100).toFixed(4));
}

export function resolveGrade(score: number, bands: ScaleBand[]) {
  const match = bands.find((band) => score >= band.minScore && score <= band.maxScore);
  if (!match) return { grade: 'U', points: null, remark: null };
  return { grade: match.grade, points: match.points ?? null, remark: match.remark ?? null };
}

export type RankingInput = { studentId: string; total: number };

export function computePositions(rows: RankingInput[]) {
  const sorted = [...rows].sort((a, b) => b.total - a.total || a.studentId.localeCompare(b.studentId));
  let currentPosition = 0;
  let previousScore: number | null = null;

  return sorted.map((row, index) => {
    if (previousScore === null || row.total !== previousScore) currentPosition = index + 1;
    previousScore = row.total;
    return { ...row, position: currentPosition };
  });
}
