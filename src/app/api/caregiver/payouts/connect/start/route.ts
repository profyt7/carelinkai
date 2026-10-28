
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/caregiver/payouts/connect/start
 * Creates a Stripe Connect account for a caregiver if one doesn't exist
 * Returns an account onboarding link
 * Requires CAREGIVER role
 */
export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any, { forbiddenMessage: "Only caregivers can access payout features" });
    if (error) return error;

    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session!.user!.id! },
      include: { user: true }
    });
    if (!caregiver) return NextResponse.json({ error: "Caregiver record not found" }, { status: 404 });

    const preferences = (caregiver.user.preferences as any) || {};
    let accountId = (preferences as any).stripeConnectAccountId as string | undefined;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: session!.user!.email!,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '8050',
          product_description: 'Caregiving services',
        },
        metadata: {
          userId: session!.user!.id!,
          caregiverId: caregiver.id,
        },
      });
      accountId = account.id;
      await prisma.user.update({
        where: { id: session!.user!.id! },
        data: { preferences: { ...preferences, stripeConnectAccountId: accountId } },
      });
    }

    const appUrl = process.env['APP_URL'] || 'http://localhost:3000';
    const accountLink = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: `${appUrl}/settings/payouts?refresh=true`,
      return_url: `${appUrl}/settings/payouts?success=true`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating Connect account:", error);
    return NextResponse.json({ error: "Failed to create Connect account" }, { status: 500 });
  }
}
