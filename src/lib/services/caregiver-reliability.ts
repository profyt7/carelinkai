import { prisma } from '@/lib/prisma';

/**
 * Computes a 0–100 reliability score for a caregiver based on:
 * - Average review rating (40% weight)
 * - Shift completion rate (40% weight)
 * - Background check status (20% weight)
 *
 * Persists the score to caregiver.reliabilityScore and returns it.
 */
export async function computeAndSaveReliabilityScore(caregiverId: string): Promise<number> {
  const caregiver = await prisma.caregiver.findUnique({
    where: { id: caregiverId },
    select: {
      backgroundCheckStatus: true,
      reviews: { select: { rating: true } },
      shifts: { select: { status: true } },
    },
  });

  if (!caregiver) return 0;

  // Review score (0–100)
  let reviewScore = 50; // neutral default if no reviews
  if (caregiver.reviews.length > 0) {
    const avgRating =
      caregiver.reviews.reduce((sum, r) => sum + r.rating, 0) / caregiver.reviews.length;
    reviewScore = (avgRating / 5) * 100;
  }

  // Shift completion rate (0–100)
  let shiftScore = 70; // neutral default if no shifts
  const totalShifts = caregiver.shifts.length;
  if (totalShifts > 0) {
    const completed = caregiver.shifts.filter((s) =>
      ['COMPLETED', 'APPROVED'].includes(s.status)
    ).length;
    const abandoned = caregiver.shifts.filter((s) =>
      ['CANCELLED', 'NO_SHOW'].includes(s.status)
    ).length;
    const denominator = completed + abandoned;
    shiftScore = denominator > 0 ? (completed / denominator) * 100 : 70;
  }

  // Background check score (0–100)
  const bgScore =
    caregiver.backgroundCheckStatus === 'CLEAR'
      ? 100
      : caregiver.backgroundCheckStatus === 'PENDING'
      ? 60
      : 30; // NOT_STARTED, CONSIDER, EXPIRED, or FAILED

  const score = Math.round(reviewScore * 0.4 + shiftScore * 0.4 + bgScore * 0.2);
  const clamped = Math.min(100, Math.max(0, score));

  await prisma.caregiver.update({
    where: { id: caregiverId },
    data: { reliabilityScore: clamped },
  });

  return clamped;
}

/**
 * Recomputes reliability scores for all caregivers.
 * Called by a cron job or admin endpoint.
 */
export async function recomputeAllReliabilityScores(): Promise<{ updated: number }> {
  const caregivers = await prisma.caregiver.findMany({ select: { id: true } });
  for (const c of caregivers) {
    await computeAndSaveReliabilityScore(c.id).catch((err) =>
      console.error(`[RELIABILITY] Failed for ${c.id}:`, err)
    );
  }
  return { updated: caregivers.length };
}
