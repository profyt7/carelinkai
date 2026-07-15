import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token';
import { stopDpLeadsForEmail } from '@/lib/dp-outreach/dp-followup';

/**
 * One-click unsubscribe for cold-outreach (claim-nudge) email — CAN-SPAM / RFC 8058.
 *
 * - GET  (clicked link in the email body): suppresses + renders a confirmation page.
 * - POST (List-Unsubscribe-Post one-click from Gmail/Apple Mail): suppresses + 200.
 *
 * Suppressing is idempotent (upsert) and immediate (well under the 10-business-day
 * rule). The batch sender (scripts/send-claim-nudges.ts) skips any suppressed address
 * on every future run. No auth — the signed token IS the authorization.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function suppress(token: string | null): Promise<string | null> {
  if (!token) return null;
  const secret = process.env['NEXTAUTH_SECRET'] || '';
  if (!secret) return null;
  const payload = verifyUnsubscribeToken(token, secret);
  if (!payload) return null;
  const email = payload.email.toLowerCase();
  await prisma.emailSuppression.upsert({
    where: { email },
    update: { reason: 'unsubscribe' },
    create: { email, reason: 'unsubscribe', source: 'claim-nudge' },
  });
  // Also halt any active DP follow-up sequence for this address immediately
  // (feat/dp-lead-capture) — the suppression list gates future sends, but this
  // flips the lead's own status to 'stopped' so admin reflects it at once.
  try {
    await stopDpLeadsForEmail(email, 'unsubscribe');
  } catch {
    // Non-fatal — suppression already recorded, which is enough to stop sends.
  }
  return email;
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

export async function GET(req: NextRequest) {
  const email = await suppress(new URL(req.url).searchParams.get('token'));
  if (email) {
    return page('You’re unsubscribed', `We won’t email <strong>${email}</strong> about CareLinkAI directory listings again.`, 200);
  }
  return page('Link invalid', 'This unsubscribe link is invalid. Reply to the email and we’ll remove you manually.', 400);
}

export async function POST(req: NextRequest) {
  const email = await suppress(new URL(req.url).searchParams.get('token'));
  return NextResponse.json({ ok: Boolean(email) }, { status: email ? 200 : 400 });
}
