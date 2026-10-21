/**
 * GET /api/admin/checkout-preflight — admin only (OL-162).
 * Booleans + the Stripe key MODE only. No env value is ever returned.
 */

export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { checkoutPreflight } from '@/lib/concierge/preflight';

export async function GET() {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const p = checkoutPreflight();
  return NextResponse.json({ ...p, checkedAt: new Date().toISOString() }, { headers: { 'cache-control': 'no-store' } });
}
