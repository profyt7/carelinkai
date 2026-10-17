/**
 * GET /api/concierge/offer — which CTA the paid offer card renders (sprint W5-3).
 * { mode: 'checkout' | 'request' | 'waitlist', checkoutEnabled, capReached, price }.
 * Public, cache-free, no personal data. The capacity number itself is not exposed.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { capStatus } from '@/lib/concierge/orders';
import { CONCIERGE_OFFER, ctaLabelFor } from '@/lib/concierge/offer';
import { captureError } from '@/lib/sentry';

export async function GET() {
  try {
    const cap = await capStatus();
    return NextResponse.json(
      { mode: cap.mode, label: ctaLabelFor(cap.mode), checkoutEnabled: cap.checkoutEnabled, capReached: cap.capReached, priceDisplay: CONCIERGE_OFFER.priceDisplay },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'concierge-checkout' } });
    // Fail safe: the unpaid request path always works.
    return NextResponse.json({ mode: 'request', label: ctaLabelFor('request'), checkoutEnabled: false, capReached: false, priceDisplay: CONCIERGE_OFFER.priceDisplay }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
