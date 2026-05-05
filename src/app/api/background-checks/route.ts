export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createInvitation, CHECKR_PACKAGES, CheckrPackageKey } from "@/lib/checkr";
import { z } from "zod";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

const orderSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.string().max(100).optional(),
  packageType: z.enum(["BASIC", "ENHANCED", "MVR", "PREMIUM"]).default("BASIC"),
});

/**
 * POST /api/background-checks
 * Order a standalone background check on any person (by name + email).
 * BASIC is free. Paid tiers return a Stripe clientSecret.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAnyRole(["FAMILY", "OPERATOR"] as any);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });
  }

  const { firstName, lastName, email, role, packageType } = parsed.data;
  const pkg = CHECKR_PACKAGES[packageType as CheckrPackageKey];
  const userId = session!.user!.id!;
  const userRole = (session!.user as any).role ?? "FAMILY";

  // Paid tier: create Stripe PaymentIntent first
  if (pkg.price > 0) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pkg.price * 100),
      currency: "usd",
      metadata: { firstName, lastName, email, role: role ?? "", packageType, orderedByUserId: userId },
      description: `${pkg.label} on ${firstName} ${lastName}`,
    });
    return NextResponse.json({ requiresPayment: true, clientSecret: paymentIntent.client_secret, packageType, price: pkg.price, label: pkg.label });
  }

  // Free (BASIC): run immediately
  const invitation = await createInvitation({ firstName, lastName, email, packageName: pkg.checkrName });

  const record = await prisma.backgroundCheckInvitation.create({
    data: {
      orderedByUserId: userId,
      orderedByRole: userRole,
      subjectFirstName: firstName,
      subjectLastName: lastName,
      subjectEmail: email,
      subjectRole: role ?? null,
      packageType,
      pricePaid: null,
      checkrInvitationId: invitation.id,
      invitationUrl: invitation.invitationUrl,
      status: "INVITED",
      expiresAt: invitation.expiresAt ? new Date(invitation.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  // Notify the orderer
  await prisma.notification.create({
    data: {
      userId,
      type: "SYSTEM",
      title: "Background Check Invited",
      message: `${firstName} ${lastName} has been sent an invitation to complete a ${pkg.label}. Results arrive in ${pkg.turnaround} after they consent.`,
      isRead: false,
    },
  });

  return NextResponse.json({ success: true, id: record.id, invitationUrl: invitation.invitationUrl, status: "INVITED" });
}

/**
 * GET /api/background-checks
 * Returns all background check invitations ordered by the logged-in user.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAnyRole(["FAMILY", "OPERATOR"] as any);
  if (error) return error;

  const checks = await prisma.backgroundCheckInvitation.findMany({
    where: { orderedByUserId: session!.user!.id! },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ checks });
}
