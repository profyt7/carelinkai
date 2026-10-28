// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { logger } from "@/lib/logger";
import { PAYOUT_LEDGERS } from "@/lib/payouts/balance";

/**
 * POST /api/caregiver/payouts/request
 *
 * OL-185: this route used to transfer whatever amount the caregiver typed from
 * the platform balance to their Connect account. Caregivers have no funded
 * earnings ledger (approved timesheets are never charged to the operator — see
 * src/lib/payouts/balance.ts), so there is nothing the platform holds that it
 * could pay out. It returns 503 before touching Stripe until such a ledger
 * exists; then compute the balance there and gate the transfer on it, as the
 * operator route does.
 */
export async function POST(_request: NextRequest) {
  const { session, error } = await requireAnyRole(["CAREGIVER"] as any, { forbiddenMessage: "Only caregivers can request payouts" });
  if (error) return error;

  logger.warn("payout_rejected", { role: "CAREGIVER", userId: session!.user!.id!, reason: "no_ledger", ledger: PAYOUT_LEDGERS.CAREGIVER });
  return NextResponse.json({ error: "payouts not enabled" }, { status: 503 });
}
