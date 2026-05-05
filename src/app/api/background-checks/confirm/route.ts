export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createInvitation, CHECKR_PACKAGES, CheckrPackageKey } from "@/lib/checkr";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

/**
 * PUT /api/background-checks/confirm
 * Called after Stripe payment succeeds for a paid background check invitation.
 * Body: { paymentIntentId }
 */
export async function PUT(req: NextRequest) {
  const { session, error } = await requireAnyRole(["FAMILY", "OPERATOR"] as any);
  if (error) return error;

  const { paymentIntentId } = await req.json();
  if (!paymentIntentId) return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });

  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (paymentIntent.status !== "succeeded") {
    return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
  }

  const { firstName, lastName, email, role, packageType, orderedByUserId } = paymentIntent.metadata;
  if (orderedByUserId !== session!.user!.id!) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const pkg = CHECKR_PACKAGES[packageType as CheckrPackageKey];
  const userRole = (session!.user as any).role ?? "FAMILY";

  const invitation = await createInvitation({ firstName, lastName, email, packageName: pkg.checkrName });

  const record = await prisma.backgroundCheckInvitation.create({
    data: {
      orderedByUserId,
      orderedByRole: userRole,
      subjectFirstName: firstName,
      subjectLastName: lastName,
      subjectEmail: email,
      subjectRole: role || null,
      packageType,
      pricePaid: pkg.price,
      stripePaymentId: paymentIntentId,
      checkrInvitationId: invitation.id,
      invitationUrl: invitation.invitationUrl,
      status: "INVITED",
      expiresAt: invitation.expiresAt ? new Date(invitation.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.notification.create({
    data: {
      userId: orderedByUserId,
      type: "SYSTEM",
      title: "Background Check Invited",
      message: `${firstName} ${lastName} has been sent an invitation to complete a ${pkg.label}. Results arrive in ${pkg.turnaround} after they consent.`,
      isRead: false,
    },
  });

  return NextResponse.json({ success: true, id: record.id, invitationUrl: invitation.invitationUrl, status: "INVITED" });
}
