import { prisma } from "@/lib/prisma";

export type RideStats = {
  totalRides: number;
  completedRides: number;
  completionRate: number;   // 0-100
  onTimeRides: number;
  onTimeRate: number;       // 0-100, based on rides with actualPickupAt recorded
  canceledByProvider: number;
  noShowBreakdown: Record<string, number>;
  reliabilityScore: number; // weighted: 60% completion + 40% on-time
  hasEnoughData: boolean;   // false when < 3 completed rides
};

const ON_TIME_GRACE_MINUTES = 15;
const MIN_RIDES_FOR_SCORE = 3;

/**
 * Computes reliability stats for a transport provider.
 * Returns null if the provider does not offer transportation.
 */
export async function computeProviderRideStats(providerId: string): Promise<RideStats | null> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { serviceTypes: true },
  });

  if (!provider?.serviceTypes.includes("transportation")) return null;

  const [completedCount, canceledByProviderCount, startedRides, canceledWithCause] = await Promise.all([
    prisma.ride.count({ where: { providerId, status: "COMPLETED" } }),
    prisma.ride.count({ where: { providerId, status: "CANCELED", canceledBy: "PROVIDER" } }),
    prisma.ride.findMany({
      where: { providerId, actualPickupAt: { not: null } },
      select: { scheduledAt: true, actualPickupAt: true },
    }),
    prisma.ride.groupBy({
      by: ["noShowCausedBy"],
      where: { providerId, status: "CANCELED", noShowCausedBy: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const noShowBreakdown: Record<string, number> = {};
  for (const row of canceledWithCause) {
    if (row.noShowCausedBy) noShowBreakdown[row.noShowCausedBy] = row._count._all;
  }

  const totalRides = completedCount + canceledByProviderCount;
  const completionRate = totalRides > 0
    ? Math.round((completedCount / totalRides) * 100)
    : 100;

  const onTimeRides = startedRides.filter((r) => {
    if (!r.actualPickupAt) return false;
    const deadline = new Date(r.scheduledAt.getTime() + ON_TIME_GRACE_MINUTES * 60 * 1000);
    return r.actualPickupAt <= deadline;
  }).length;

  const onTimeRate = startedRides.length > 0
    ? Math.round((onTimeRides / startedRides.length) * 100)
    : 100;

  const reliabilityScore = Math.round(completionRate * 0.6 + onTimeRate * 0.4);

  return {
    totalRides,
    completedRides: completedCount,
    completionRate,
    onTimeRides,
    onTimeRate,
    canceledByProvider: canceledByProviderCount,
    noShowBreakdown,
    reliabilityScore,
    hasEnoughData: completedCount >= MIN_RIDES_FOR_SCORE,
  };
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 95) return { label: "Excellent", color: "text-success-700 bg-success-100" };
  if (score >= 85) return { label: "Very Good",  color: "text-success-700 bg-success-100" };
  if (score >= 75) return { label: "Good",       color: "text-primary-700 bg-primary-100" };
  if (score >= 60) return { label: "Fair",       color: "text-amber-700 bg-amber-100" };
  return               { label: "Needs Work",   color: "text-error-700 bg-error-100" };
}
