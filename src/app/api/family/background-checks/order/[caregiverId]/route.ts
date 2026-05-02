export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createCandidate, createReport, CHECKR_PACKAGES, CheckrPackageKey } from "@/lib/checkr";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

/**
 * POST /api/family/background-checks/order/[caregiverId]
 * Body: { packageType: "BASIC" | "ENHANCED" | "MVR" | "PREMIUM" }
 *
 * BASIC is free. Others create a Stripe payment intent and return clientSecret.
 * The frontend completes Stripe payment, then calls /confirm to trigger Checkr.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { caregiverId: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["FAMILY"] as any);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const packageType: CheckrPackageKey = body.packageType ?? "BASIC";

    if (!CHECKR_PACKAGES[packageType]) {
      return NextResponse.json({ error: "Invalid package type" }, { status: 400 });
    }

    const pkg = CHECKR_PACKAGES[packageType];

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.caregiverId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    // Check for existing non-expired order of same or higher tier
    const existingOrder = await prisma.backgroundCheckOrder.findFirst({
      where: {
        caregiverId: params.caregiverId,
        orderedByUserId: session!.user!.id!,
        packageType,
        status: { in: ["PENDING", "CLEAR"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        alreadyOrdered: true,
        orderId: existingOrder.id,
        status: existingOrder.status,
        message: "You already have this check in progress or completed.",
      });
    }

    // BASIC is free — run immediately
    if (pkg.price === 0) {
      return runCheck(caregiver, packageType, pkg, session!.user!.id!, null);
    }

    // Paid checks — create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pkg.price * 100),
      currency: "usd",
      metadata: {
        caregiverId: params.caregiverId,
        orderedByUserId: session!.user!.id!,
        packageType,
      },
      description: `${pkg.label} for caregiver ${caregiver.user.firstName} ${caregiver.user.lastName}`,
    });

    return NextResponse.json({
      success: true,
      requiresPayment: true,
      clientSecret: paymentIntent.client_secret,
      packageType,
      price: pkg.price,
      label: pkg.label,
    });
  } catch (error) {
    console.error("Error ordering background check:", error);
    return NextResponse.json({ error: "Failed to order background check" }, { status: 500 });
  }
}

/**
 * PUT /api/family/background-checks/order/[caregiverId]
 * Confirms a paid check after Stripe payment succeeds.
 * Body: { paymentIntentId, packageType }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { caregiverId: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["FAMILY"] as any);
    if (error) return error;

    const body = await request.json();
    const { paymentIntentId, packageType } = body as {
      paymentIntentId: string;
      packageType: CheckrPackageKey;
    };

    // Verify payment succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    // Verify metadata matches
    if (
      paymentIntent.metadata.caregiverId !== params.caregiverId ||
      paymentIntent.metadata.orderedByUserId !== session!.user!.id!
    ) {
      return NextResponse.json({ error: "Payment metadata mismatch" }, { status: 403 });
    }

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.caregiverId },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    const pkg = CHECKR_PACKAGES[packageType];
    return runCheck(caregiver, packageType, pkg, session!.user!.id!, paymentIntentId);
  } catch (error) {
    console.error("Error confirming background check:", error);
    return NextResponse.json({ error: "Failed to confirm background check" }, { status: 500 });
  }
}

async function runCheck(
  caregiver: any,
  packageType: CheckrPackageKey,
  pkg: (typeof CHECKR_PACKAGES)[CheckrPackageKey],
  orderedByUserId: string,
  stripePaymentId: string | null
) {
  // Create/reuse Checkr candidate
  let candidateId = caregiver.checkrCandidateId;
  if (!candidateId) {
    const candidate = await createCandidate({
      firstName: caregiver.user.firstName,
      lastName: caregiver.user.lastName,
      email: caregiver.user.email,
    });
    candidateId = candidate.id;
    await prisma.caregiver.update({
      where: { id: caregiver.id },
      data: { checkrCandidateId: candidateId },
    });
  }

  const report = await createReport(candidateId, pkg.checkrName);

  const order = await prisma.backgroundCheckOrder.create({
    data: {
      caregiverId: caregiver.id,
      orderedByType: "FAMILY",
      orderedByUserId,
      status: "PENDING",
      packageType,
      checkrPackageName: pkg.checkrName,
      checkrReportId: report.id,
      pricePaid: pkg.price > 0 ? pkg.price : null,
      stripePaymentId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  // Notify caregiver
  await prisma.notification.create({
    data: {
      userId: caregiver.userId,
      type: "SYSTEM",
      title: "Background Check Ordered",
      message: `A family ordered a ${pkg.label} on your profile. Results in ${pkg.turnaround}.`,
      isRead: false,
    },
  });

  return NextResponse.json({
    success: true,
    orderId: order.id,
    reportId: report.id,
    packageType,
    status: "PENDING",
    message: `${pkg.label} ordered. Results typically in ${pkg.turnaround}.`,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { caregiverId: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["FAMILY"] as any);
    if (error) return error;

    const caregiver = await prisma.caregiver.findUnique({
      where: { id: params.caregiverId },
      select: { backgroundCheckStatus: true, backgroundCheckReportUrl: true },
    });

    if (!caregiver) {
      return NextResponse.json({ error: "Caregiver not found" }, { status: 404 });
    }

    const myOrders = await prisma.backgroundCheckOrder.findMany({
      where: {
        caregiverId: params.caregiverId,
        orderedByUserId: session!.user!.id!,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        packageType: true,
        status: true,
        createdAt: true,
        completedAt: true,
        pricePaid: true,
      },
    });

    return NextResponse.json({
      success: true,
      caregiverStatus: caregiver.backgroundCheckStatus,
      myOrders,
    });
  } catch (error) {
    console.error("Error fetching background check orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
