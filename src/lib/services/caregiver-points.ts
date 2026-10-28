import { prisma } from '@/lib/prisma';

const TIER_THRESHOLDS = { BRONZE: 0, SILVER: 100, GOLD: 300, PLATINUM: 700 } as const;

function tierForPoints(lifetime: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
  if (lifetime >= TIER_THRESHOLDS.PLATINUM) return 'PLATINUM';
  if (lifetime >= TIER_THRESHOLDS.GOLD) return 'GOLD';
  if (lifetime >= TIER_THRESHOLDS.SILVER) return 'SILVER';
  return 'BRONZE';
}

async function getOrCreateAccount(caregiverId: string) {
  return prisma.caregiverPoints.upsert({
    where: { caregiverId },
    create: { caregiverId },
    update: {},
  });
}

export async function awardPoints(
  caregiverId: string,
  points: number,
  type: string,
  description: string,
): Promise<void> {
  const account = await getOrCreateAccount(caregiverId);
  const newTotal = Math.max(0, account.totalPoints + points);
  const newLifetime = points > 0 ? account.lifetimePoints + points : account.lifetimePoints;
  const newTier = tierForPoints(newLifetime);

  await prisma.$transaction([
    prisma.caregiverPoints.update({
      where: { id: account.id },
      data: { totalPoints: newTotal, lifetimePoints: newLifetime, tier: newTier as any },
    }),
    prisma.pointTransaction.create({
      data: { accountId: account.id, points, type: type as any, description },
    }),
  ]);
}

/** Called when a timesheet is approved — awards points for on-time arrival and completion */
export async function awardTimesheetPoints(caregiverId: string, shiftId: string): Promise<void> {
  try {
    const shift = await prisma.caregiverShift.findUnique({
      where: { id: shiftId },
      select: { startTime: true },
    });
    const timesheet = await prisma.timesheet.findUnique({
      where: { shiftId },
      select: { startTime: true },
    });

    if (shift && timesheet) {
      const lateMs = timesheet.startTime.getTime() - shift.startTime.getTime();
      const lateMinutes = lateMs / 60_000;

      if (lateMinutes <= 15) {
        await awardPoints(caregiverId, 5, 'ON_TIME_SHIFT', 'On-time shift arrival');

        // Check for 5-in-a-row streak
        const recentOnTime = await prisma.pointTransaction.count({
          where: {
            account: { caregiverId },
            type: 'ON_TIME_SHIFT',
            createdAt: { gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
          },
        });
        if (recentOnTime > 0 && recentOnTime % 5 === 0) {
          await awardPoints(caregiverId, 10, 'STREAK_5_SHIFTS', '5-shift on-time streak bonus!');
        }
      }
    }

    // Points for completing the shift regardless of arrival time
    await awardPoints(caregiverId, 3, 'SHIFT_COMPLETED', 'Shift completed');

    // Check no call-offs in past 30 days milestone
    const recentCallOffs = await prisma.callOff.count({
      where: {
        caregiverId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });
    if (recentCallOffs === 0) {
      // Award 30-day no call-off bonus once per month (check last award)
      const lastBonus = await prisma.pointTransaction.findFirst({
        where: { account: { caregiverId }, type: 'NO_CALLOFF_30_DAYS' },
        orderBy: { createdAt: 'desc' },
      });
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      if (!lastBonus || lastBonus.createdAt < thirtyDaysAgo) {
        await awardPoints(caregiverId, 20, 'NO_CALLOFF_30_DAYS', '30 days without a call-off!');
      }
    }
  } catch (err) {
    console.error('[POINTS] awardTimesheetPoints error:', err);
  }
}

/** Called when a positive (4+ star) review is posted */
export async function awardReviewPoints(caregiverId: string, rating: number): Promise<void> {
  if (rating >= 4) {
    await awardPoints(caregiverId, 15, 'POSITIVE_REVIEW', `${rating}-star resident review`).catch(() => {});
  }
}

/** Called when a call-off is recorded — deducts points */
export async function penalizeCallOff(caregiverId: string, type: string): Promise<void> {
  const penalties: Record<string, number> = {
    NO_SHOW: -30,
    CALLED_OFF: -15,
    EARLY_DEPARTURE: -12,
    LATE_ARRIVAL: -5,
  };
  const pts = penalties[type] ?? -10;
  await awardPoints(caregiverId, pts, 'CALL_OFF_PENALTY', `Call-off recorded: ${type.replace(/_/g, ' ').toLowerCase()}`).catch(() => {});
}

export async function getPointsSummary(caregiverId: string) {
  const account = await prisma.caregiverPoints.findUnique({
    where: { caregiverId },
    include: {
      transactions: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  });
  return account ?? { totalPoints: 0, lifetimePoints: 0, tier: 'BRONZE', transactions: [] };
}
