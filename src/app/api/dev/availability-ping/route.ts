export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upsertAvailabilityContact } from '@/lib/availability/ping-engine';

/**
 * DEV-ONLY (ALLOW_DEV_ENDPOINTS=1) helpers so the one-tap ping can be driven
 * end-to-end in e2e without a mailbox. Never sends anything.
 *
 *   POST { action: 'contact', homeId, name?, email, optedIn?, source?, preferredChannel? }
 *        → upsert the home's availability contact
 *   POST { action: 'backdate-ping', pingId, daysAgo }
 *        → move a ping's sentAt/expiresAt into the past (to exercise expiry)
 *   GET  ?homeId=…  → { contact, latestPing (incl. token), home availability }
 */
export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === 'contact') {
      const homeId = String(body.homeId || '');
      if (!homeId) return NextResponse.json({ error: 'homeId required' }, { status: 400 });
      const contact = await upsertAvailabilityContact({
        homeId,
        name: typeof body.name === 'string' ? body.name : 'E2E Contact',
        email: typeof body.email === 'string' ? body.email : null,
        mobile: typeof body.mobile === 'string' ? body.mobile : null,
        preferredChannel: body.preferredChannel === 'SMS' ? 'SMS' : 'EMAIL',
        optedIn: body.optedIn !== false,
        source: typeof body.source === 'string' ? body.source : 'operator_portal',
      });
      return NextResponse.json({ ok: true, contact });
    }
    if (body?.action === 'backdate-ping') {
      const pingId = String(body.pingId || '');
      const daysAgo = typeof body.daysAgo === 'number' ? body.daysAgo : 11;
      const sentAt = new Date(Date.now() - daysAgo * 86_400_000);
      const ping = await prisma.availabilityPing.update({
        where: { id: pingId },
        data: { sentAt, expiresAt: new Date(sentAt.getTime() + 10 * 86_400_000) },
      });
      return NextResponse.json({ ok: true, ping });
    }
    if (body?.action === 'cleanup') {
      // Remove what a spec seeded so later specs in the same job never lose
      // their own home off page 1 of /search (10 per page). Cascades delete
      // the contacts + pings. Only rows the spec names are touched.
      const homeIds: string[] = Array.isArray(body.homeIds) ? body.homeIds.filter((x: unknown) => typeof x === 'string') : [];
      const emails: string[] = Array.isArray(body.emails) ? body.emails.filter((x: unknown) => typeof x === 'string') : [];
      const homes = homeIds.length ? await prisma.assistedLivingHome.deleteMany({ where: { id: { in: homeIds } } }) : { count: 0 };
      let users = 0;
      for (const email of emails) {
        const u = await prisma.user.findUnique({ where: { email }, select: { id: true, operator: { select: { id: true } } } });
        if (!u) continue;
        if (u.operator) {
          await prisma.assistedLivingHome.deleteMany({ where: { operatorId: u.operator.id } });
          await prisma.operator.delete({ where: { id: u.operator.id } }).catch(() => undefined);
        }
        await prisma.user.delete({ where: { id: u.id } }).catch(() => undefined);
        users++;
      }
      return NextResponse.json({ ok: true, homes: homes.count, users });
    }
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    console.error('dev availability-ping error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  const homeId = req.nextUrl.searchParams.get('homeId') || '';
  if (!homeId) return NextResponse.json({ error: 'homeId required' }, { status: 400 });
  const [contact, latestPing, home] = await Promise.all([
    prisma.availabilityContact.findUnique({ where: { homeId } }),
    prisma.availabilityPing.findFirst({ where: { homeId }, orderBy: { sentAt: 'desc' } }),
    prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: { availabilityCount: true, availabilityVerifiedAt: true, availabilitySource: true },
    }),
  ]);
  return NextResponse.json({ contact, latestPing, home });
}
