/**
 * GET /api/admin/checkout-preflight — admin only (OL-162).
 * Booleans + the Stripe key MODE only. No env value is ever returned.
 * OL-186: also lists each paid-feature kill switch (name + on/off).
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { checkoutPreflight } from '@/lib/concierge/preflight';
import { paidFeatureStatus } from '@/lib/billing/paid-features';

export async function GET() {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const p = checkoutPreflight();
  // OL-248: upfront concierge checkout is retired — never reported as on, whatever the flag says.
  return NextResponse.json(
    { ...p, checkoutEnabled: false, checkoutRetired: true, paidFeatures: paidFeatureStatus(), checkedAt: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
