/**
 * /api/operator/availability-contact — the operator's own "availability
 * contact" for a home they own (sprint W4-1).
 *
 *   GET  ?homeId=…            → current contact (or null)
 *   PUT  { homeId, name, email?, mobile?, preferredChannel?, optedIn }
 *
 * optedIn is consent: flipping it on stamps optedInAt + optedInSource =
 * 'operator_portal'; flipping it off stamps optedOutAt. Nothing is sent here.
 * OPERATOR (own homes) or ADMIN (any home).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireOperatorOrAdmin } from '@/lib/rbac';
import { upsertAvailabilityContact, reportPingError } from '@/lib/availability/ping-engine';

async function ownedHome(email: string, homeId: string) {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });
  if (!user) return null;
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: homeId }, select: { id: true, operator: { select: { userId: true } } } });
  if (!home) return null;
  if (user.role === UserRole.ADMIN || home.operator?.userId === user.id) return home;
  return null;
}

export async function GET(request: NextRequest) {
  const { session, error } = await requireOperatorOrAdmin();
  if (error) return error;
  const homeId = request.nextUrl.searchParams.get('homeId') || '';
  if (!homeId) return NextResponse.json({ error: 'homeId required' }, { status: 400 });
  const home = await ownedHome(session!.user!.email!, homeId);
  if (!home) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const contact = await prisma.availabilityContact.findUnique({ where: { homeId } });
  return NextResponse.json({ contact });
}

export async function PUT(request: NextRequest) {
  const { session, error } = await requireOperatorOrAdmin();
  if (error) return error;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const homeId = typeof body.homeId === 'string' ? body.homeId : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' && body.email.trim() ? body.email.trim() : null;
  const mobile = typeof body.mobile === 'string' && body.mobile.trim() ? body.mobile.trim() : null;
  const preferredChannel = body.preferredChannel === 'SMS' ? 'SMS' : 'EMAIL';
  const optedIn = body.optedIn === true;
  if (!homeId || name.length < 2) return NextResponse.json({ error: 'homeId and name required' }, { status: 400 });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  if (!email && !mobile) return NextResponse.json({ error: 'An email or a mobile number is required' }, { status: 400 });
  const home = await ownedHome(session!.user!.email!, homeId);
  if (!home) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const contact = await upsertAvailabilityContact({ homeId, name, email, mobile, preferredChannel, optedIn, source: 'operator_portal' });
    return NextResponse.json({ ok: true, contact });
  } catch (e) {
    reportPingError(e, { route: 'operator/availability-contact' });
    return NextResponse.json({ error: 'Could not save contact' }, { status: 500 });
  }
}
