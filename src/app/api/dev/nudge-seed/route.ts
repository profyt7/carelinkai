export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * DEV-ONLY (ALLOW_DEV_ENDPOINTS=1): mark a home as claim-nudged so the
 * /admin/claim-resend list can be exercised in e2e. Body:
 *   { homeId, outreachEmail, nudgedDaysAgo?, clicked?: boolean }
 * Sets outreachEmail + claimNudgeLastSentAt, and (optionally) records a
 * ClaimLinkVisit for that home + email. Never sends anything.
 *
 * DELETE { homeIds?: string[], emails?: string[] } removes what a spec seeded
 * (homes by id; operator accounts + their homes by email) so later specs in
 * the same job never lose their own home off page 1 of /search.
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

export async function DELETE(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const homeIds: string[] = Array.isArray(body?.homeIds) ? body.homeIds.filter((x: unknown) => typeof x === 'string') : [];
    const emails: string[] = Array.isArray(body?.emails) ? body.emails.filter((x: unknown) => typeof x === 'string') : [];
    const ids = new Set(homeIds);
    for (const email of emails) {
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      const op = user ? await prisma.operator.findUnique({ where: { userId: user.id }, select: { id: true } }) : null;
      if (!op) continue;
      for (const h of await prisma.assistedLivingHome.findMany({ where: { operatorId: op.id }, select: { id: true } })) ids.add(h.id);
    }
    const list = [...ids];
    if (list.length) {
      await prisma.claimLinkVisit.deleteMany({ where: { homeId: { in: list } } });
      await prisma.facilityInspection.deleteMany({ where: { facilityId: { in: list } } });
      await prisma.homePhoto.deleteMany({ where: { homeId: { in: list } } });
      await prisma.address.deleteMany({ where: { homeId: { in: list } } });
      await prisma.assistedLivingHome.deleteMany({ where: { id: { in: list } } });
    }
    return NextResponse.json({ ok: true, deleted: list.length });
  } catch (e) {
    console.error('dev nudge-seed DELETE error', e);
    return NextResponse.json({ ok: false, error: 'cleanup failed' }, { status: 200 });
  }
}
