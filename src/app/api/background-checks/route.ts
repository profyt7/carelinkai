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
 * Returns all background checks ordered by the logged-in user across all three sources:
 *  - BackgroundCheckInvitation (standalone — person outside CareLinkAI)
 *  - BackgroundCheckOrder (caregiver profile check)
 *  - ProviderBackgroundCheckOrder (provider profile check)
 * Normalized to a unified shape and sorted newest-first.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAnyRole(["FAMILY", "OPERATOR"] as any);
  if (error) return error;

  const userId = session!.user!.id!;

  const [invitations, caregiverOrders, providerOrders] = await Promise.all([
    prisma.backgroundCheckInvitation.findMany({
      where: { orderedByUserId: userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.backgroundCheckOrder.findMany({
      where: { orderedByUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        caregiver: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
    }),
    prisma.providerBackgroundCheckOrder.findMany({
      where: { orderedByUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        provider: { select: { id: true, contactName: true, businessName: true } },
      },
    }),
  ]);

  const checks = [
    ...invitations.map((inv) => ({
      id: inv.id,
      type: "INVITATION" as const,
      subjectName: `${inv.subjectFirstName} ${inv.subjectLastName}`,
      subjectEmail: inv.subjectEmail,
      subjectRole: inv.subjectRole,
      subjectLink: null as string | null,
      packageType: inv.packageType,
      pricePaid: inv.pricePaid?.toString() ?? null,
      status: inv.status,
      invitationUrl: inv.invitationUrl,
      reportUrl: inv.reportUrl ?? null,
      createdAt: inv.createdAt.toISOString(),
      completedAt: inv.completedAt?.toISOString() ?? null,
    })),
    ...caregiverOrders.map((o) => ({
      id: o.id,
      type: "CAREGIVER" as const,
      subjectName: `${o.caregiver.user.firstName} ${o.caregiver.user.lastName}`,
      subjectEmail: null as string | null,
      subjectRole: "Caregiver",
      subjectLink: `/marketplace/caregivers/${o.caregiverId}`,
      packageType: o.packageType,
      pricePaid: o.pricePaid?.toString() ?? null,
      status: o.status,
      invitationUrl: null as string | null,
      reportUrl: o.reportUrl ?? null,
      createdAt: o.createdAt.toISOString(),
      completedAt: o.completedAt?.toISOString() ?? null,
    })),
    ...providerOrders.map((o) => ({
      id: o.id,
      type: "PROVIDER" as const,
      subjectName: o.provider.contactName,
      subjectEmail: null as string | null,
      subjectRole: `Provider · ${o.provider.businessName}`,
      subjectLink: `/marketplace/providers/${o.provider.id}`,
      packageType: o.packageType,
      pricePaid: o.pricePaid?.toString() ?? null,
      status: o.status,
      invitationUrl: null as string | null,
      reportUrl: o.reportUrl ?? null,
      createdAt: o.createdAt.toISOString(),
      completedAt: o.completedAt?.toISOString() ?? null,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({ checks });
}
