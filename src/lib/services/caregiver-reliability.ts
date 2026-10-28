import { prisma } from '@/lib/prisma';

// Call-off penalty weights (last 90 days)
const CALLOFF_PENALTY: Record<string, number> = {
  NO_SHOW: 25,
  CALLED_OFF: 12,
  EARLY_DEPARTURE: 10,
  LATE_ARRIVAL: 5,
};

/**
 * Computes a 0–100 reliability score:
 * - Reviews          30%
 * - Shift completion 25%
 * - Background check 20%
 * - Call-off record  25%
 */
export async function computeAndSaveReliabilityScore(caregiverId: string): Promise<number> {
  const caregiver = await prisma.caregiver.findUnique({
    where: { id: caregiverId },
    select: {
      backgroundCheckStatus: true,
      reviews: { select: { rating: true } },
      shifts: { select: { status: true } },
      callOffs: {
        where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        select: { type: true },
      },
    },
  });

  if (!caregiver) return 0;

  // Review score (0–100)
  let reviewScore = 50;
  if (caregiver.reviews.length > 0) {
    const avg = caregiver.reviews.reduce((s, r) => s + r.rating, 0) / caregiver.reviews.length;
    reviewScore = (avg / 5) * 100;
  }

  // Shift completion rate (0–100)
  let shiftScore = 70;
  if (caregiver.shifts.length > 0) {
    const completed = caregiver.shifts.filter((s) => ['COMPLETED', 'APPROVED'].includes(s.status)).length;
    const abandoned = caregiver.shifts.filter((s) => ['CANCELLED', 'NO_SHOW'].includes(s.status)).length;
    const denom = completed + abandoned;
    shiftScore = denom > 0 ? (completed / denom) * 100 : 70;
  }

  // Background check score (0–100)
  const bgScore =
    caregiver.backgroundCheckStatus === 'CLEAR' ? 100
    : caregiver.backgroundCheckStatus === 'PENDING' ? 60
    : 30;

  // Call-off score (0–100, starts at 100, penalized per incident in last 90 days)
  const totalPenalty = caregiver.callOffs.reduce(
    (sum, c) => sum + (CALLOFF_PENALTY[c.type] ?? 5),
    0,
  );
  const callOffScore = Math.max(0, 100 - totalPenalty);

  const score = Math.round(
    reviewScore * 0.30 +
    shiftScore  * 0.25 +
    bgScore     * 0.20 +
    callOffScore * 0.25,
  );

  const clamped = Math.min(100, Math.max(0, score));

  await prisma.caregiver.update({ where: { id: caregiverId }, data: { reliabilityScore: clamped } });
  return clamped;
}

export async function recomputeAllReliabilityScores(): Promise<{ updated: number }> {
  const caregivers = await prisma.caregiver.findMany({ select: { id: true } });
  for (const c of caregivers) {
    await computeAndSaveReliabilityScore(c.id).catch((err) =>
      console.error(`[RELIABILITY] Failed for ${c.id}:`, err),
    );
  }
  return { updated: caregivers.length };
}
