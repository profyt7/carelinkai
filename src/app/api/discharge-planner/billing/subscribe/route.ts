export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

/**
 * Discharge-planner access is FREE (ratified 2026-06-27). There is no DP
 * subscription — this endpoint no longer creates a Stripe checkout. Revenue is
 * operator-subscriptions only. Returns 410 Gone so any stale client surfaces a
 * clear message instead of starting a (nonexistent) paid flow.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Discharge planner access is free — no subscription required.', free: true },
    { status: 410 },
  );
}
