/**
 * PATCH /api/admin/concierge/orders/[orderId] — Family Concierge, pay when ready (10/31). Admin only.
 *   { action: 'send_payment_link', paymentLinkUrl? } → CONCIERGE_PAYMENT_LINK_URL (or, only when that's unset,
 *                                                      the pasted link) + ?client_reference_id&prefilled_email,
 *                                                      emailed to the family
 *   { action: 'mark_paid' }                          → manual fallback: REQUESTED_UNPAID / EXPIRED → PAID
 *   { action: 'release_shortlist' }                  → manual fallback: PAID only, email the shortlist link
 *   { action: 'reopen' }                             → EXPIRED → REQUESTED_UNPAID
 * Rules live in src/lib/concierge/pay-when-ready.ts. The webhook pays + releases automatically (OL-248).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { markPaid, releaseShortlist, reopenOrder, sendPaymentLink } from '@/lib/concierge/pay-when-ready';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('send_payment_link'), paymentLinkUrl: z.string().max(500).optional() }),
  z.object({ action: z.literal('mark_paid') }),
  z.object({ action: z.literal('release_shortlist') }),
  z.object({ action: z.literal('reopen') }),
]);

export async function PATCH(request: NextRequest, { params }: { params: { orderId: string } }) {
  let admin;
  try {
    admin = await requireRole([UserRole.ADMIN]);
  } catch (error: any) {
    if (error?.name === 'UnauthenticatedError') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const actor = { userId: admin.id, role: admin.role };
  const body = parsed.data;
  try {
    const r =
      body.action === 'send_payment_link'
        ? await sendPaymentLink({ orderId: params.orderId, paymentLinkUrl: body.paymentLinkUrl, actor })
        : body.action === 'mark_paid'
          ? await markPaid({ orderId: params.orderId, actor })
          : body.action === 'reopen'
            ? await reopenOrder({ orderId: params.orderId, actor })
            : await releaseShortlist({ orderId: params.orderId, actor });
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.code });
    return NextResponse.json(r);
  } catch (error) {
    console.error('[admin/concierge/orders] action failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Could not update the order.' }, { status: 500 });
  }
}
