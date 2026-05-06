export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { createCandidate, createReport, CHECKR_PACKAGES, CheckrPackageKey } from "@/lib/checkr";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

/**
 * POST /api/family/background-checks/order-provider/[providerId]
 * Body: { packageType: "BASIC" | "ENHANCED" | "MVR" | "PREMIUM" }
 *
 * Runs a direct Checkr report on the provider's contact person.
 * BASIC is free and runs immediately. Others return a Stripe clientSecret.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["FAMILY", "OPERATOR"] as any);
    if (error) return error;

    const body = await request.json().catch(() => ({}));
    const packageType: CheckrPackageKey = body.packageType ?? "BASIC";

    if (!CHECKR_PACKAGES[packageType]) {
      return NextResponse.json({ error: "Invalid package type" }, { status: 400 });
    }

    const pkg = CHECKR_PACKAGES[packageType];

    const provider = await prisma.provider.findUnique({
      where: { id: params.providerId },
      select: {
        id: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        checkrCandidateId: true,
        businessName: true,
        userId: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Check for existing active order of same package
    const existingOrder = await prisma.providerBackgroundCheckOrder.findFirst({
      where: {
        providerId: params.providerId,
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

    if (pkg.price === 0) {
      return runProviderCheck(provider, packageType, pkg, session!.user!.id!, null);
    }

    // Paid — create Stripe PaymentIntent
    const nameParts = provider.contactName.trim().split(/\s+/);
    const firstName = nameParts[0] ?? provider.contactName;
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(pkg.price * 100),
      currency: "usd",
      metadata: {
        providerId: params.providerId,
        orderedByUserId: session!.user!.id!,
        packageType,
      },
      description: `${pkg.label} for provider contact ${firstName} ${lastName} (${provider.businessName})`,
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
    console.error("Error ordering provider background check:", error);
    return NextResponse.json({ error: "Failed to order background check" }, { status: 500 });
  }
}

/**
 * PUT /api/family/background-checks/order-provider/[providerId]
 * Confirms a paid check after Stripe payment completes.
 * Body: { paymentIntentId, packageType }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["FAMILY", "OPERATOR"] as any);
    if (error) return error;

    const body = await request.json();
    const { paymentIntentId, packageType } = body as {
      paymentIntentId: string;
      packageType: CheckrPackageKey;
    };

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    if (
      paymentIntent.metadata.providerId !== params.providerId ||
      paymentIntent.metadata.orderedByUserId !== session!.user!.id!
    ) {
      return NextResponse.json({ error: "Payment metadata mismatch" }, { status: 403 });
    }

    const provider = await prisma.provider.findUnique({
      where: { id: params.providerId },
      select: {
        id: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        checkrCandidateId: true,
        businessName: true,
        userId: true,
      },
    });

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    const pkg = CHECKR_PACKAGES[packageType];
    return runProviderCheck(provider, packageType, pkg, session!.user!.id!, paymentIntentId);
  } catch (error) {
    console.error("Error confirming provider background check:", error);
    return NextResponse.json({ error: "Failed to confirm background check" }, { status: 500 });
  }
}

async function runProviderCheck(
  provider: {
    id: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string | null;
    checkrCandidateId: string | null;
    businessName: string;
    userId: string;
  },
  packageType: CheckrPackageKey,
  pkg: (typeof CHECKR_PACKAGES)[CheckrPackageKey],
  orderedByUserId: string,
  stripePaymentId: string | null
) {
  const nameParts = provider.contactName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? provider.contactName;
  const lastName = nameParts.slice(1).join(" ") || firstName;

  // Create or reuse Checkr candidate for the provider contact
  let candidateId = provider.checkrCandidateId;
  if (!candidateId) {
    const candidate = await createCandidate({
      firstName,
      lastName,
      email: provider.contactEmail,
    });
    candidateId = candidate.id;
    await prisma.provider.update({
      where: { id: provider.id },
      data: { checkrCandidateId: candidateId },
    });
  }

  const report = await createReport(candidateId, pkg.checkrName);

  const userRole = await prisma.user.findUnique({
    where: { id: orderedByUserId },
    select: { role: true },
  });
  const orderedByType = userRole?.role === "OPERATOR" ? "OPERATOR" : "FAMILY";

  const order = await prisma.providerBackgroundCheckOrder.create({
    data: {
      providerId: provider.id,
      orderedByType,
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

  // Notify the provider
  await prisma.notification.create({
    data: {
      userId: provider.userId,
      type: "SYSTEM",
      title: "Background Check Ordered",
      message: `A ${pkg.label} was ordered on your contact information. Results in ${pkg.turnaround}.`,
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
  { params }: { params: { providerId: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["FAMILY", "OPERATOR"] as any);
    if (error) return error;

    const myOrders = await prisma.providerBackgroundCheckOrder.findMany({
      where: {
        providerId: params.providerId,
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

    return NextResponse.json({ success: true, myOrders });
  } catch (error) {
    console.error("Error fetching provider background check orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
