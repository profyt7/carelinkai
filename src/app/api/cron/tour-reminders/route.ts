/**
 * GET /api/cron/tour-reminders
 *
 * Sends 24-hour SMS reminders to families for upcoming confirmed tours.
 * Designed to be called once per day by Render's cron job scheduler.
 *
 * Secure with CRON_SECRET: requests must include
 *   Authorization: Bearer <CRON_SECRET>
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { smsService } from '@/lib/sms/sms-service';

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized triggers
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h from now
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);   // 25h from now

  // Find confirmed tours happening within the next 23-25 hours
  const upcomingTours = await prisma.tourRequest.findMany({
    where: {
      status: 'CONFIRMED',
      confirmedTime: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      family: {
        include: {
          user: { select: { firstName: true, phone: true } },
        },
      },
      home: { select: { name: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const tour of upcomingTours) {
    const phone = tour.family?.user?.phone;
    const firstName = tour.family?.user?.firstName;
    const homeName = tour.home?.name;
    const tourTime = tour.confirmedTime;

    if (!phone || !firstName || !homeName || !tourTime) {
      skipped++;
      continue;
    }

    const ok = await smsService.sendTourReminder(phone, firstName, homeName, tourTime);
    ok ? sent++ : skipped++;
  }

  console.log(`[CRON/tour-reminders] Sent: ${sent}, Skipped: ${skipped}, Total: ${upcomingTours.length}`);
  return NextResponse.json({ sent, skipped, total: upcomingTours.length });
}
