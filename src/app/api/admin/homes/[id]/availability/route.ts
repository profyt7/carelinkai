/**
 * Admin availability controls (OL-110). ADMIN-only.
 *
 * GET  → current availability view + the email magic-link (for Anita to send).
 * POST → set contactMobile / availabilityOptIn, and/or log a CONCIERGE / VOICE /
 *        OPERATOR availability confirmation (count + source, stamped now).
 *
 * Business data only (no PHI). Every write is admin-gated.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth-utils';
import { UserRole } from '@prisma/client';
import type { AvailabilitySource } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { availabilityView, updateAvailability, normalizeCount, toE164 } from '@/lib/availability/availability';
import { signAvailabilityToken } from '@/lib/availability/availability-token';

const ADMIN_LOGGABLE: AvailabilitySource[] = ['CONCIERGE', 'VOICE', 'OPERATOR'];

function magicLink(homeId: string): string | null {
  const secret = process.env['NEXTAUTH_SECRET'];
  if (!secret) return null;
  const base = (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
  return `${base}/availability/update?token=${encodeURIComponent(signAvailabilityToken(homeId, secret))}`;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, contactMobile: true, availabilityOptIn: true, availabilityCount: true, availabilityVerifiedAt: true, availabilitySource: true },
  });
  if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({
    home: { id: home.id, name: home.name, contactMobile: home.contactMobile, availabilityOptIn: home.availabilityOptIn },
    view: availabilityView(home),
    magicLink: magicLink(home.id),
  });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const home = await prisma.assistedLivingHome.findUnique({ where: { id: params.id }, select: { id: true } });
  if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await request.json().catch(() => ({} as Record<string, unknown>));

  // 1) Contact + consent updates.
  const data: { contactMobile?: string | null; availabilityOptIn?: boolean } = {};
  if ('contactMobile' in body) {
    data.contactMobile = body['contactMobile'] ? toE164(String(body['contactMobile'])) : null;
  }
  if ('availabilityOptIn' in body) data.availabilityOptIn = !!body['availabilityOptIn'];
  if (Object.keys(data).length) await prisma.assistedLivingHome.update({ where: { id: params.id }, data });

  // 2) Log a concierge / voice / operator availability confirmation.
  let view = null;
  if (body['source']) {
    const source = String(body['source']).toUpperCase() as AvailabilitySource;
    if (!ADMIN_LOGGABLE.includes(source)) {
      return NextResponse.json({ error: 'source must be CONCIERGE, VOICE, or OPERATOR' }, { status: 400 });
    }
    const count = body['count'] == null ? null : normalizeCount(body['count']);
    view = await updateAvailability({ homeId: params.id, count, source });
  }

  return NextResponse.json({ ok: true, view, magicLink: magicLink(params.id) });
}
