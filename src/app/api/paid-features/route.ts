/**
 * GET /api/paid-features — which paid features are switched on (OL-186).
 * Booleans only, no env values. Public: the UI uses it to hide buttons, pages
 * and nav links for features that are off.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { paidFeatureFlags } from '@/lib/billing/paid-features';

export async function GET() {
  return NextResponse.json(paidFeatureFlags(), { headers: { 'cache-control': 'no-store' } });
}
