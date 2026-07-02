/**
 * GET /api/cron/availability-sms  — weekly availability SMS poll (SMS channel).
 *
 * Texts opted-in facility contacts "How many openings this week? Reply with a number."
 * FEATURE-FLAGGED OFF by default: no messages are sent unless AVAILABILITY_SMS_ENABLED
 * is truthy (like CLAIM_DRIP_ENABLED). Only ever texts homes with availabilityOptIn=true
 * AND a contactMobile (TCPA: consented numbers only). Skips homes verified in the last
 * week so we don't over-text. Secured with CRON_SECRET. Business data only (no PHI).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { smsService } from '@/lib/sms/sms-service';
import { AVAILABILITY_FRESH_DAYS } from '@/lib/availability/availability';

function availabilitySmsEnabled(): boolean {
  const v = (process.env['AVAILABILITY_SMS_ENABLED'] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env['CRON_SECRET'];
  if (cronSecret && request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!availabilitySmsEnabled()) {
    return NextResponse.json({ ok: true, disabled: true, polled: 0, sent: 0 });
  }
  if (!smsService.isConfigured()) {
    return NextResponse.json({ ok: false, error: 'Twilio not configured' }, { status: 200 });
  }

  // Only text consented contacts whose availability is missing or stale (weekly cadence).
  const staleCutoff = new Date(Date.now() - AVAILABILITY_FRESH_DAYS * 86_400_000);
  const homes = await prisma.assistedLivingHome.findMany({
    where: {
      status: 'ACTIVE',
      availabilityOptIn: true,
      contactMobile: { not: null },
      OR: [{ availabilityVerifiedAt: null }, { availabilityVerifiedAt: { lt: staleCutoff } }],
    },
    select: { id: true, name: true, contactMobile: true },
    take: 500,
  });

  let sent = 0;
  for (const h of homes) {
    const msg =
      `CareLinkAI: How many openings does ${h.name} have this week? Reply with a number ` +
      `(e.g. 3) to update your free listing. Reply STOP to opt out.`;
    // eslint-disable-next-line no-await-in-loop
    const ok = await smsService.sendSMS(h.contactMobile as string, msg);
    if (ok) sent++;
  }
  return NextResponse.json({ ok: true, polled: homes.length, sent });
}
