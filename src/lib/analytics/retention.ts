import { prisma } from '@/lib/prisma';

/** OL-226: AnalyticsEvent rows are kept 90 days. */
export const ANALYTICS_RETENTION_DAYS = 90;

/** Delete funnel events older than the retention window. Never throws; returns rows deleted (or null on error). */
export async function purgeExpiredAnalyticsEvents(now: Date = new Date()): Promise<number | null> {
  const cutoff = new Date(now.getTime() - ANALYTICS_RETENTION_DAYS * 86_400_000);
  try {
    const { count } = await prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
    return count;
  } catch {
    return null;
  }
}
