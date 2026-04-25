import { prisma } from '@/lib/prisma';

export type RiskLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface RetentionRisk {
  level: RiskLevel;
  factors: string[];
  score: number; // 0-100, higher = more at-risk
}

export async function computeRetentionRisk(caregiverId: string): Promise<RetentionRisk> {
  const caregiver = await prisma.caregiver.findUnique({
    where: { id: caregiverId },
    select: {
      reliabilityScore: true,
      hireDate: true,
      callOffs: {
        where: { createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        select: { type: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
      shifts: {
        where: { startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        select: { status: true, startTime: true },
        orderBy: { startTime: 'desc' },
      },
    },
  });

  if (!caregiver) return { level: 'LOW', factors: [], score: 0 };

  const factors: string[] = [];
  let riskScore = 0;

  const now = Date.now();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Low reliability score
  const reliability = caregiver.reliabilityScore ?? 70;
  if (reliability < 40) {
    factors.push(`Reliability score critically low (${Math.round(reliability)}/100)`);
    riskScore += 40;
  } else if (reliability < 60) {
    factors.push(`Reliability score below threshold (${Math.round(reliability)}/100)`);
    riskScore += 20;
  }

  // No-shows are the strongest signal
  const noShows = caregiver.callOffs.filter((c) => c.type === 'NO_SHOW');
  const recentNoShows = noShows.filter((c) => c.createdAt >= thirtyDaysAgo);
  if (recentNoShows.length >= 2) {
    factors.push(`${recentNoShows.length} no-shows in the last 30 days`);
    riskScore += 35;
  } else if (noShows.length >= 2) {
    factors.push(`${noShows.length} no-shows in the last 90 days`);
    riskScore += 20;
  }

  // Escalating call-off pattern (more recent than older)
  const recentCallOffs = caregiver.callOffs.filter((c) => c.createdAt >= thirtyDaysAgo).length;
  const olderCallOffs = caregiver.callOffs.length - recentCallOffs;
  if (recentCallOffs > 1 && recentCallOffs >= olderCallOffs) {
    factors.push(`Call-off frequency increasing (${recentCallOffs} in last 30 days)`);
    riskScore += 20;
  }

  // No activity — potential ghosting
  const lastShift = caregiver.shifts[0];
  const daysSinceLastShift = lastShift
    ? Math.floor((now - new Date(lastShift.startTime).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  if (daysSinceLastShift !== null && daysSinceLastShift > 21) {
    factors.push(`No shifts in ${daysSinceLastShift} days`);
    riskScore += 15;
  }

  // New hire with early problems
  const daysSinceHire = caregiver.hireDate
    ? Math.floor((now - new Date(caregiver.hireDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  if (daysSinceHire !== null && daysSinceHire < 30 && caregiver.callOffs.length > 0) {
    factors.push(`Early call-off within first 30 days of hire`);
    riskScore += 20;
  }

  const clamped = Math.min(100, riskScore);
  const level: RiskLevel = clamped >= 50 ? 'HIGH' : clamped >= 25 ? 'MEDIUM' : 'LOW';

  return { level, factors, score: clamped };
}

export async function getAtRiskCaregivers(operatorId: string): Promise<
  Array<{ id: string; name: string; risk: RetentionRisk; reliabilityScore: number | null }>
> {
  const caregivers = await prisma.caregiver.findMany({
    where: {
      employments: { some: { operatorId, endDate: null } },
      employmentStatus: { in: ['ACTIVE', 'ON_LEAVE'] },
    },
    select: {
      id: true,
      reliabilityScore: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const results = await Promise.all(
    caregivers.map(async (c) => ({
      id: c.id,
      name: `${c.user.firstName} ${c.user.lastName}`,
      reliabilityScore: c.reliabilityScore,
      risk: await computeRetentionRisk(c.id),
    })),
  );

  return results
    .filter((r) => r.risk.level !== 'LOW')
    .sort((a, b) => b.risk.score - a.risk.score);
}
