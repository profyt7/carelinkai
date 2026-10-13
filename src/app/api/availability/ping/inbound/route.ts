/**
 * POST /api/availability/ping/inbound — an operator REPLIED to the ping email.
 *
 * Generic inbound-email hook (wire Resend/other inbound parsing to it at
 * go-live): body { from, text, subject? }. The sender's address is matched to
 * their latest outstanding ping; the reply text (quoted history stripped) is
 * parsed with the same rules as the one-tap links: bare integer / none / full
 * → listing updated (source=PING); STOP → opted out; anything else → admin queue.
 *
 * Secured with PING_INBOUND_SECRET (Bearer) — fails CLOSED when unset.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { extractReplyText } from '@/lib/availability/ping';
import { applyInboundEmailReply, reportPingError } from '@/lib/availability/ping-engine';

export async function POST(request: NextRequest) {
  const secret = process.env['PING_INBOUND_SECRET'];
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let body: { from?: unknown; text?: unknown; html?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const from = typeof body.from === 'string' ? body.from : '';
  const fromEmail = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
  const text = typeof body.text === 'string' ? body.text : '';
  if (!fromEmail) return NextResponse.json({ error: 'from required' }, { status: 400 });
  try {
    const result = await applyInboundEmailReply({ fromEmail, text: extractReplyText(text) });
    return NextResponse.json(result, { status: result.ok ? 200 : 202 });
  } catch (error) {
    reportPingError(error);
    return NextResponse.json({ error: 'Could not process reply' }, { status: 500 });
  }
}
