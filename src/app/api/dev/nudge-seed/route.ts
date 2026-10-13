export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DEV-ONLY (ALLOW_DEV_ENDPOINTS=1): mark a home as claim-nudged so the
 * /admin/claim-resend list can be exercised in e2e. Body:
 *   { homeId, outreachEmail, nudgedDaysAgo?, clicked?: boolean }
 * Sets outreachEmail + claimNudgeLastSentAt, and (optionally) records a
 * ClaimLinkVisit for that home + email. Never sends anything.
 */
export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const homeId = typeof body?.homeId === 'string' ? body.homeId : '';
    const outreachEmail = typeof body?.outreachEmail === 'string' ? body.outreachEmail.toLowerCase() : '';
    if (!homeId || !outreachEmail) return NextResponse.json({ error: 'homeId and outreachEmail required' }, { status: 400 });
    const daysAgo = typeof body?.nudgedDaysAgo === 'number' ? body.nudgedDaysAgo : 3;
    await prisma.assistedLivingHome.update({
      where: { id: homeId },
      data: { outreachEmail, claimNudgeLastSentAt: new Date(Date.now() - daysAgo * 86_400_000) },
    });
    if (body?.clicked === true) {
      await prisma.claimLinkVisit.create({ data: { homeId, operatorEmail: outreachEmail, source: 'claim_page' } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('dev nudge-seed error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
