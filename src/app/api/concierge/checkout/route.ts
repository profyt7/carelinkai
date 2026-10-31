/**
 * POST /api/concierge/checkout — RETIRED (OL-248).
 *
 * The Family Concierge used to offer upfront Stripe Checkout ("Book the concierge — $399") behind
 * CONCIERGE_CHECKOUT_ENABLED. That contradicted pay when ready, so it can no longer be turned on: this
 * route always answers 410 with { fallback: 'request' } and stores nothing. Families request through
 * /api/concierge/request; payment is the Payment Link sent when their shortlist is ready.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Upfront checkout is retired. Request your shortlist instead — you pay only when it is ready.', fallback: 'request' },
    { status: 410 },
  );
}
