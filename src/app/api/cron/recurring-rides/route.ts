export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SPAWN_WINDOW_DAYS = 14;

function addFrequency(date: Date, frequency: string): Date {
  const d = new Date(date);
  switch (frequency) {
    case "DAILY":    d.setDate(d.getDate() + 1);      break;
    case "WEEKLY":   d.setDate(d.getDate() + 7);      break;
    case "BIWEEKLY": d.setDate(d.getDate() + 14);     break;
    case "MONTHLY":  d.setMonth(d.getMonth() + 1);    break;
  }
  return d;
}

/**
 * GET /api/cron/recurring-rides
 * Spawns the next occurrence of each active recurring ride series,
 * up to SPAWN_WINDOW_DAYS ahead. Protected by CRON_SECRET.
 * Render cron: 0 7 * * * (daily at 7am)
 */
export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + SPAWN_WINDOW_DAYS);

  // Find all seed recurring rides that aren't canceled
  const roots = await prisma.ride.findMany({
    where: {
      isRecurring: true,
      recurringRootId: null,
      status: { notIn: ["CANCELED"] },
      OR: [
        { recurringEndDate: null },
        { recurringEndDate: { gt: now } },
      ],
    },
  });

  let created = 0;
  let skipped = 0;

  for (const root of roots) {
    if (!root.recurringFrequency) { skipped++; continue; }

    // Find the latest scheduled ride in this series (root or any child)
    const latestChild = await prisma.ride.findFirst({
      where: { recurringRootId: root.id },
      orderBy: { scheduledAt: "desc" },
    });

    let cursor = latestChild?.scheduledAt ?? root.scheduledAt;
    let nextDate = addFrequency(cursor, root.recurringFrequency);

    // Fill the window — create all missing occurrences up to windowEnd
    while (nextDate <= windowEnd) {
      if (root.recurringEndDate && nextDate > root.recurringEndDate) break;

      // Calculate return time offset from original
      let returnScheduledAt: Date | null = null;
      if (root.needsReturn && root.returnScheduledAt && root.scheduledAt) {
        const offsetMs = root.returnScheduledAt.getTime() - root.scheduledAt.getTime();
        returnScheduledAt = new Date(nextDate.getTime() + offsetMs);
      }

      await prisma.ride.create({
        data: {
          familyId:        root.familyId,
          operatorId:      root.operatorId,
          providerId:      root.providerId,
          bookedByRole:    root.bookedByRole,
          leadId:          root.leadId,
          residentName:    root.residentName,
          residentId:      root.residentId,
          pickupAddress:   root.pickupAddress,
          dropoffAddress:  root.dropoffAddress,
          scheduledAt:     nextDate,
          tripPurpose:     root.tripPurpose,
          passengerCount:  root.passengerCount,
          specialRequests: root.specialRequests,
          mobilityLevel:   root.mobilityLevel,
          doorToDoorLevel: root.doorToDoorLevel,
          needsOxygen:     root.needsOxygen,
          hasCompanion:    root.hasCompanion,
          cognitionNote:   root.cognitionNote,
          hasServiceAnimal: root.hasServiceAnimal,
          waitTimeMinutes: root.waitTimeMinutes,
          needsReturn:     root.needsReturn,
          returnScheduledAt,
          isSharedRide:    root.isSharedRide,
          estimatedMiles:  root.estimatedMiles,
          estimatedFare:   root.estimatedFare,
          baseFare:        root.baseFare,
          platformFeePercent: root.platformFeePercent,
          platformFee:     root.platformFee,
          totalAmount:     root.totalAmount,
          // Series linkage
          recurringRootId: root.id,
          isRecurring:     false,
          status:          "REQUESTED",
        },
      });

      created++;
      cursor = nextDate;
      nextDate = addFrequency(cursor, root.recurringFrequency);
    }
  }

  console.log(`[recurring-rides cron] roots=${roots.length} created=${created} skipped=${skipped}`);
  return NextResponse.json({ ok: true, roots: roots.length, created, skipped });
}
