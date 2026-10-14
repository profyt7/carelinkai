/**
 * /api/admin/availability-pings — admin view of the weekly ping (sprint W4-1).
 * Admin only; anything else → 403.
 *
 *   GET                      → { rows, counts, generatedAt }  (sent / replied / expired / stop / admin_review per facility)
 *   GET ?format=call-list    → CSV of contacts whose ping expired with no reply (VA / AI-voice call list)
 *   POST { homeId, name, email?, mobile?, preferredChannel?, optedIn, source? }
 *                            → upsert a contact; default source 'admin_call' (opt-in captured by a human on a call)
 *   PATCH { pingId, count }  → resolve an ADMIN_REVIEW ping with a confirmed count
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { adminPingRows, callListCsv, resolvePingByAdmin, upsertAvailabilityContact, reportPingError } from '@/lib/availability/ping-engine';
import { normalizeCount } from '@/lib/availability/availability';

async function admin(): Promise<boolean> {
  try {
    await requireRole([UserRole.ADMIN]);
    return true;
  } catch {
    return false;
  }
}
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });

export async function GET(request: NextRequest) {
  if (!(await admin())) return forbidden();
  try {
    const rows = await adminPingRows();
    if (request.nextUrl.searchParams.get('format') === 'call-list') {
      return new NextResponse(callListCsv(rows), {
        status: 200,
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="availability-call-list-${new Date().toISOString().slice(0, 10)}.csv"`,
          'cache-control': 'no-store',
        },
      });
    }
    const counts = { contacts: rows.length, optedIn: 0, sent: 0, replied: 0, expired: 0, stop: 0, adminReview: 0, callList: 0 };
    for (const r of rows) {
      if (r.contact.optedIn) counts.optedIn++;
      if (r.onCallList) counts.callList++;
      switch (r.lastPing?.state) {
        case 'sent': counts.sent++; break;
        case 'replied': counts.replied++; break;
        case 'expired': counts.expired++; break;
        case 'stop': counts.stop++; break;
        case 'admin_review': counts.adminReview++; break;
        default: break;
      }
    }
    return NextResponse.json({ rows, counts, generatedAt: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    reportPingError(e, { route: 'admin/availability-pings GET' });
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await admin())) return forbidden();
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
  const source = body.source === 'operator_portal' ? 'operator_portal' : 'admin_call';
  if (!homeId || name.length < 2) return NextResponse.json({ error: 'homeId and name required' }, { status: 400 });
  if (!email && !mobile) return NextResponse.json({ error: 'An email or a mobile number is required' }, { status: 400 });
  try {
    const contact = await upsertAvailabilityContact({ homeId, name, email, mobile, preferredChannel, optedIn, source });
    return NextResponse.json({ ok: true, contact });
  } catch (e) {
    reportPingError(e, { route: 'admin/availability-pings POST' });
    return NextResponse.json({ error: 'Could not save contact (does the home exist?)' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await admin())) return forbidden();
  let body: { pingId?: unknown; count?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const pingId = typeof body.pingId === 'string' ? body.pingId : '';
  const count = normalizeCount(body.count);
  if (!pingId || count === null) return NextResponse.json({ error: 'pingId and a count are required' }, { status: 400 });
  try {
    const view = await resolvePingByAdmin({ pingId, count });
    if (!view) return NextResponse.json({ error: 'Ping not found' }, { status: 404 });
    return NextResponse.json({ ok: true, view });
  } catch (e) {
    reportPingError(e, { route: 'admin/availability-pings PATCH' });
    return NextResponse.json({ error: 'Could not resolve' }, { status: 500 });
  }
}
