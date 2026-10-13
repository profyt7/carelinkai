/**
 * /api/availability/ping/unsubscribe?token=… — STOP for the availability ping
 * (CAN-SPAM / RFC 8058 one-click).
 *
 * - GET  (link in the email footer): opts the contact out + confirmation page.
 * - POST (List-Unsubscribe-Post from Gmail/Apple Mail): opts out + 200.
 *
 * Opting out is idempotent and immediate: optedIn=false on the contact, so the
 * weekly run never picks them again. The ping token IS the authorization.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { applyPingReply, reportPingError } from '@/lib/availability/ping-engine';
import { prisma } from '@/lib/prisma';

async function stop(token: string | null): Promise<{ facilityName: string | null; done: boolean }> {
  if (!token) return { facilityName: null, done: false };
  const r = await applyPingReply({ token, raw: 'STOP', via: 'link' });
  if (r.ok) return { facilityName: r.facilityName, done: true };
  if (r.error === 'invalid') return { facilityName: null, done: false };
  // Already answered / expired: still honour the opt-out on the contact itself.
  const ping = await prisma.availabilityPing.findUnique({ where: { token }, select: { contactId: true, home: { select: { name: true } } } });
  if (ping) {
    await prisma.availabilityContact.update({ where: { id: ping.contactId }, data: { optedIn: false, optedOutAt: new Date() } });
    return { facilityName: ping.home.name, done: true };
  }
  return { facilityName: null, done: false };
}

function page(title: string, body: string, status: number): NextResponse {
  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;color:#1f2937;max-width:520px;margin:64px auto;padding:0 20px;text-align:center;line-height:1.6">
  <h2 style="color:#0d9488">${title}</h2>
  <p>${body}</p>
  <p style="color:#9ca3af;font-size:13px">CareLinkAI · Cleveland, OH</p>
</body></html>`;
  return new NextResponse(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export async function GET(request: NextRequest) {
  try {
    const r = await stop(request.nextUrl.searchParams.get('token'));
    if (!r.done) return page('Link not recognized', 'This opt-out link is invalid. Reply STOP to any ping email and we will stop.', 400);
    return page('You are opted out', `We will not send availability pings${r.facilityName ? ` for ${r.facilityName}` : ''} again.`, 200);
  } catch (error) {
    reportPingError(error);
    return page('Something went wrong', 'Please reply STOP to the email instead.', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    let token = request.nextUrl.searchParams.get('token');
    if (!token) {
      const form = await request.formData().catch(() => null);
      token = form ? String(form.get('token') ?? '') : '';
    }
    const r = await stop(token || null);
    return NextResponse.json({ ok: r.done }, { status: r.done ? 200 : 400 });
  } catch (error) {
    reportPingError(error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
