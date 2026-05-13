
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { bindRequestLogger } from "@/lib/logger";
import { InvoiceStatus, SubscriptionPlan, SubscriptionStatus } from "@prisma/client";
import { smsService } from "@/lib/sms/sms-service";
import { captureError } from '@/lib/sentry';

/**
 * Utility: maps Stripe Transfer status strings to internal PaymentStatus values
 */
const mapTransferStatus = (
  status: string | null | undefined
): "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | undefined => {
  switch ((status || "").toLowerCase()) {
    case "pending":
      return "PROCESSING";
    case "paid":
      return "COMPLETED";
    case "canceled":
    case "failed":
      return "FAILED";
    default:
      return undefined;
  }
};

/**
 * Maps a Stripe subscription status string to our internal SubscriptionStatus enum.
 */
function mapSubscriptionStatus(stripeStatus: string): SubscriptionStatus {
  switch (stripeStatus) {
    case "trialing":       return SubscriptionStatus.TRIALING;
    case "active":         return SubscriptionStatus.ACTIVE;
    case "past_due":       return SubscriptionStatus.PAST_DUE;
    case "canceled":       return SubscriptionStatus.CANCELED;
    case "incomplete":     return SubscriptionStatus.INCOMPLETE;
    case "incomplete_expired": return SubscriptionStatus.INCOMPLETE_EXPIRED;
    case "paused":         return SubscriptionStatus.PAUSED;
    default:               return SubscriptionStatus.INCOMPLETE;
  }
}

/**
 * Resolves the SubscriptionPlan from Stripe subscription metadata or by
 * looking up the price ID against our configured env var price IDs.
 */
function resolvePlan(
  metadata: Stripe.Metadata,
  items?: Stripe.ApiList<Stripe.SubscriptionItem>
): SubscriptionPlan | null {
  // Prefer the plan stored in metadata (set during checkout)
  const metaPlan = metadata["plan"]?.toUpperCase();
  if (metaPlan && metaPlan in SubscriptionPlan) {
    return metaPlan as SubscriptionPlan;
  }

  // Fall back to matching price ID
  const priceId = items?.data[0]?.price?.id;
  if (priceId) {
    if (priceId === process.env["STRIPE_PRICE_STARTER"])      return SubscriptionPlan.STARTER;
    if (priceId === process.env["STRIPE_PRICE_PROFESSIONAL"]) return SubscriptionPlan.PROFESSIONAL;
    if (priceId === process.env["STRIPE_PRICE_GROWTH"])       return SubscriptionPlan.GROWTH;
  }

  return null;
}

/**
 * Finds the Operator record by Stripe customer ID.
 */
async function findOperatorByCustomer(customerId: string) {
  return prisma.operator.findUnique({ where: { stripeCustomerId: customerId } });
}

/**
 * Finds a DischargePlannerProfile by Stripe customer ID.
 */
async function findDischargePlannerByCustomer(customerId: string) {
  return prisma.dischargePlannerProfile.findUnique({ where: { stripeCustomerId: customerId } });
}

/**
 * Finds a Provider by Stripe customer ID (listing subscription).
 */
async function findProviderByCustomer(customerId: string) {
  return prisma.provider.findUnique({ where: { stripeCustomerId: customerId } });
}

/**
 * Finds a Caregiver by Stripe customer ID (pro subscription).
 */
async function findCaregiverByProCustomer(customerId: string) {
  return prisma.caregiver.findUnique({ where: { proStripeCustomerId: customerId } });
}

/**
 * Finds a Family by Stripe customer ID (Plus subscription).
 */
async function findFamilyByCustomer(customerId: string) {
  return prisma.family.findUnique({ where: { stripeCustomerId: customerId } });
}

/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events:
 * - payment_intent.succeeded (family wallet deposits)
 * - transfer.* (caregiver payout reconciliation)
 * - customer.subscription.created / updated / deleted (operator SaaS billing)
 * - invoice.payment_succeeded / invoice.payment_failed (operator billing lifecycle)
 */
export async function POST(request: NextRequest) {
  const logger = bindRequestLogger(request);
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    let event: Stripe.Event;

    const secret = process.env["STRIPE_WEBHOOK_SECRET"];

    if (process.env["NODE_ENV"] === "production") {
      if (!secret) {
        logger.error("Stripe webhook secret not configured in production");
        return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
      }
      if (!signature) {
        logger.warn("Missing stripe-signature header");
        return NextResponse.json({ error: "Bad Request" }, { status: 400 });
      }
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          tags: { route: 'webhooks:stripe' },
        });
        logger.error("Webhook signature verification failed", { err: err instanceof Error ? err.message : err });
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      // dev/test: allow JSON without signature for local testing
      try {
        event = secret && signature
          ? stripe.webhooks.constructEvent(rawBody, signature, secret)
          : (JSON.parse(rawBody) as Stripe.Event);
        if (!secret || !signature) {
          logger.info("Webhook signature bypassed (non-production)");
        }
      } catch (err) {
        captureError(err instanceof Error ? err : new Error(String(err)), {
          tags: { route: 'webhooks:stripe' },
        });
        logger.error("Invalid webhook payload", { err: err instanceof Error ? err.message : err });
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
    }

    // ─── Transfer events: caregiver payout reconciliation ───────────────────
    if (event.type && event.type.startsWith("transfer.")) {
      const transfer = event.data.object as Stripe.Transfer;
      const newStatus = mapTransferStatus((transfer as any).status);

      if (!newStatus) {
        return NextResponse.json(
          { received: true, message: "Transfer event ignored (no status mapping)" },
          { status: 200 }
        );
      }

      const transferId = transfer.id;
      const metadata: any = (transfer as any).metadata || {};

      const byId = await prisma.payment.updateMany({
        where: { stripePaymentId: transferId, type: "CAREGIVER_PAYMENT" },
        data: { status: newStatus },
      });

      let updatedCount = byId.count;

      if (updatedCount === 0 && metadata.hireId) {
        const byHire = await prisma.payment.updateMany({
          where: { marketplaceHireId: metadata.hireId, type: "CAREGIVER_PAYMENT" },
          data: { status: newStatus, stripePaymentId: transferId },
        });
        updatedCount += byHire.count;
      }

      logger.info("Stripe transfer processed", { transferId, updatedCount });
      return NextResponse.json({ received: true, message: "Transfer processed", updated: updatedCount }, { status: 200 });
    }

    // ─── Subscription lifecycle events ──────────────────────────────────────
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const status = mapSubscriptionStatus(sub.status);
      const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
      const currentPeriodEndsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

      // Check operator first
      const operator = await findOperatorByCustomer(customerId);
      if (operator) {
        const plan = resolvePlan(sub.metadata, sub.items);
        await prisma.operator.update({
          where: { id: operator.id },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: status,
            ...(plan && { subscriptionPlan: plan }),
            ...(trialEndsAt !== null && { trialEndsAt }),
            ...(currentPeriodEndsAt !== null && { currentPeriodEndsAt }),
          },
        });
        logger.info("Operator subscription updated", { operatorId: operator.id, status, plan, subscriptionId: sub.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Check discharge planner
      const dpProfile = await findDischargePlannerByCustomer(customerId);
      if (dpProfile) {
        await prisma.dischargePlannerProfile.update({
          where: { id: dpProfile.id },
          data: {
            stripeSubscriptionId: sub.id,
            subscriptionStatus: status,
            ...(trialEndsAt !== null && { trialEndsAt }),
            ...(currentPeriodEndsAt !== null && { currentPeriodEndsAt }),
          },
        });
        logger.info("Discharge planner subscription updated", { profileId: dpProfile.id, status, subscriptionId: sub.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Check provider listing subscription
      const provider = await findProviderByCustomer(customerId);
      if (provider) {
        await prisma.provider.update({
          where: { id: provider.id },
          data: {
            stripeSubscriptionId: sub.id,
            listingStatus: status,
            ...(currentPeriodEndsAt !== null && { listingPeriodEndsAt: currentPeriodEndsAt }),
          },
        });
        logger.info("Provider listing subscription updated", { providerId: provider.id, status, subscriptionId: sub.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Check caregiver pro subscription
      const caregiver = await findCaregiverByProCustomer(customerId);
      if (caregiver) {
        const isActive = status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;
        await prisma.caregiver.update({
          where: { id: caregiver.id },
          data: {
            proStripeSubscriptionId: sub.id,
            proStatus: status,
            isPro: isActive,
            ...(currentPeriodEndsAt !== null && { proPeriodEndsAt: currentPeriodEndsAt }),
          },
        });
        logger.info("Caregiver pro subscription updated", { caregiverId: caregiver.id, status, isPro: isActive });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Check family Plus subscription
      const family = await findFamilyByCustomer(customerId);
      if (family) {
        const isActive = status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;
        await prisma.family.update({
          where: { id: family.id },
          data: {
            stripeSubscriptionId: sub.id,
            plusStatus: status,
            isPlus: isActive,
            ...(currentPeriodEndsAt !== null && { plusPeriodEndsAt: currentPeriodEndsAt }),
          },
        });
        logger.info("Family Plus subscription updated", { familyId: family.id, status, isPlus: isActive });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      logger.info("Subscription event for unknown customer", { customerId, subscriptionId: sub.id });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const operator = await findOperatorByCustomer(customerId);
      if (operator) {
        await prisma.operator.update({
          where: { id: operator.id },
          data: { subscriptionStatus: SubscriptionStatus.CANCELED },
        });
        logger.info("Operator subscription canceled", { operatorId: operator.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const dpProfile = await findDischargePlannerByCustomer(customerId);
      if (dpProfile) {
        await prisma.dischargePlannerProfile.update({
          where: { id: dpProfile.id },
          data: { subscriptionStatus: SubscriptionStatus.CANCELED },
        });
        logger.info("Discharge planner subscription canceled", { profileId: dpProfile.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Provider listing canceled
      const providerCanceled = await findProviderByCustomer(customerId);
      if (providerCanceled) {
        await prisma.provider.update({
          where: { id: providerCanceled.id },
          data: { listingStatus: SubscriptionStatus.CANCELED },
        });
        logger.info("Provider listing subscription canceled", { providerId: providerCanceled.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Caregiver pro canceled
      const caregiverCanceled = await findCaregiverByProCustomer(customerId);
      if (caregiverCanceled) {
        await prisma.caregiver.update({
          where: { id: caregiverCanceled.id },
          data: { proStatus: SubscriptionStatus.CANCELED, isPro: false },
        });
        logger.info("Caregiver pro subscription canceled", { caregiverId: caregiverCanceled.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Family Plus canceled
      const familyCanceled = await findFamilyByCustomer(customerId);
      if (familyCanceled) {
        await prisma.family.update({
          where: { id: familyCanceled.id },
          data: { plusStatus: SubscriptionStatus.CANCELED, isPlus: false },
        });
        logger.info("Family Plus subscription canceled", { familyId: familyCanceled.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      logger.info("Subscription deletion for unknown customer", { customerId });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const operator = await findOperatorByCustomer(customerId);
      if (!operator) {
        // May be a family wallet invoice — fall through to payment_intent handler
        return NextResponse.json({ received: true, message: "Not an operator invoice" }, { status: 200 });
      }

      // Update subscription status to ACTIVE on successful payment
      await prisma.operator.update({
        where: { id: operator.id },
        data: {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          ...(invoice.period_end && { currentPeriodEndsAt: new Date(invoice.period_end * 1000) }),
        },
      });

      // Persist invoice record
      const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      await prisma.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          operatorId: operator.id,
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId: subId ?? null,
          status: InvoiceStatus.PAID,
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          description: invoice.description ?? null,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdf: invoice.invoice_pdf ?? null,
          paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        },
        update: {
          status: InvoiceStatus.PAID,
          amountPaid: invoice.amount_paid,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdf: invoice.invoice_pdf ?? null,
          paidAt: invoice.status_transitions?.paid_at ? new Date(invoice.status_transitions.paid_at * 1000) : null,
        },
      });

      // Settle any queued fees (placement, hire, featured listing) for this billing cycle
      const settled = await prisma.payment.updateMany({
        where: {
          userId: operator.userId,
          type: { in: ["PLACEMENT_FEE", "MARKETPLACE_HIRE_FEE", "FEATURED_LISTING_FEE"] },
          status: "PROCESSING",
        },
        data: { status: "COMPLETED" },
      });

      logger.info("Operator invoice payment succeeded", { operatorId: operator.id, invoiceId: invoice.id, feesSettled: settled.count });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (!customerId) {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const operator = await findOperatorByCustomer(customerId);
      if (!operator) {
        return NextResponse.json({ received: true, message: "Not an operator invoice" }, { status: 200 });
      }

      await prisma.operator.update({
        where: { id: operator.id },
        data: { subscriptionStatus: SubscriptionStatus.PAST_DUE },
      });

      // Persist invoice record (open = payment failed / awaiting retry)
      const failedSubId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
      await prisma.invoice.upsert({
        where: { stripeInvoiceId: invoice.id },
        create: {
          operatorId: operator.id,
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId: failedSubId ?? null,
          status: InvoiceStatus.OPEN,
          amountDue: invoice.amount_due,
          amountPaid: invoice.amount_paid,
          currency: invoice.currency,
          description: invoice.description ?? null,
          periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
          periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
          invoicePdf: invoice.invoice_pdf ?? null,
        },
        update: {
          status: InvoiceStatus.OPEN,
          invoiceUrl: invoice.hosted_invoice_url ?? null,
        },
      });

      // SMS alert to operator (non-blocking)
      const operatorUser = await prisma.user.findUnique({
        where: { id: operator.userId },
        select: { firstName: true, phone: true },
      });
      if (operatorUser?.phone) {
        smsService.sendPaymentFailedAlert(operatorUser.phone, operatorUser.firstName).catch(() => {});
      }

      logger.info("Operator invoice payment failed", { operatorId: operator.id, invoiceId: invoice.id });
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // ─── checkout.session.completed ──────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const cs = event.data.object as Stripe.Checkout.Session;
      const type = cs.metadata?.["type"];

      // Ride payment
      if (type === "RIDE_PAYMENT") {
        const rideId = cs.metadata?.["rideId"];
        if (rideId) {
          const ride = await prisma.ride.update({
            where: { id: rideId },
            data: {
              status: "PAID",
              stripePaymentIntentId: cs.payment_intent as string ?? null,
            },
            include: {
              provider: { select: { contactEmail: true, contactName: true, businessName: true } },
              family: { select: { user: { select: { firstName: true, lastName: true } } } },
            },
          }).catch((err: any) => { logger.error("Failed to mark ride PAID", { err: err?.message, rideId }); return null; });

          if (ride) {
            logger.info("Ride payment completed", { rideId });
            notifyProviderRidePaid(ride).catch(() => {});
          }
        }
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Compliance kit purchase
      const purchaseId = cs.metadata?.["purchaseId"];
      if (purchaseId) {
        await prisma.complianceKitPurchase.update({
          where: { id: purchaseId },
          data: { status: 'COMPLETED' },
        }).catch((err: any) => logger.error("Failed to mark compliance kit COMPLETED", { err: err?.message }));
        logger.info("Compliance kit purchase completed", { purchaseId });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      return NextResponse.json({ received: true, message: "Checkout session without known type" }, { status: 200 });
    }

    // ─── payment_intent.succeeded: family wallet deposits ───────────────────
    if (event.type !== "payment_intent.succeeded") {
      return NextResponse.json({ received: true, message: "Ignored event type" }, { status: 200 });
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const stripePaymentId = paymentIntent.id;
    const amount = paymentIntent.amount; // in cents
    const metadata = paymentIntent.metadata || {};
    const familyId = (metadata as any)["familyId"];
    const walletId = (metadata as any)["walletId"];
    const userId = (metadata as any)["userId"];

    if (!familyId || !userId) {
      logger.warn("Missing required metadata", { stripePaymentId, hasFamilyId: !!familyId, hasUserId: !!userId });
      return NextResponse.json({ error: "Missing required metadata" }, { status: 400 });
    }

    // Idempotency: skip if already processed
    const existingPayment = await prisma.payment.findFirst({ where: { stripePaymentId } });
    if (existingPayment) {
      logger.info("Payment already processed", { stripePaymentId });
      return NextResponse.json({ received: true, message: "Payment already processed" }, { status: 200 });
    }

    await prisma.$transaction(async (tx: any) => {
      let wallet = null as any;

      if (walletId) {
        wallet = await tx.familyWallet.findUnique({ where: { id: walletId } });
        if (!wallet) {
          logger.warn("Wallet not found by id; falling back to familyId", { walletId, familyId });
        }
      }

      if (!wallet) {
        wallet = await tx.familyWallet.findFirst({ where: { familyId } });
      }

      if (!wallet) {
        wallet = await tx.familyWallet.create({ data: { familyId, balance: 0 } });
        logger.info("Created wallet for family", { familyId, walletId: wallet.id });
      }

      const amountDecimal = amount / 100;
      const newBalance = parseFloat(wallet.balance.toString()) + amountDecimal;

      await tx.familyWallet.update({ where: { id: wallet.id }, data: { balance: newBalance } });

      await tx.payment.create({
        data: {
          userId,
          amount: amountDecimal,
          status: "COMPLETED",
          type: "DEPOSIT",
          stripePaymentId
        },
      });

      await tx.walletTransaction.create({
        data: { walletId: wallet.id, type: "DEPOSIT", amount: amountDecimal },
      });
    });

    logger.info("Payment processed", { stripePaymentId });
    return NextResponse.json({ received: true, success: true }, { status: 200 });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { route: 'webhooks:stripe' },
    });
    logger.error("Error processing Stripe webhook", { err: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function notifyProviderRidePaid(ride: {
  id: string; scheduledAt: Date; pickupAddress: string; dropoffAddress: string;
  totalAmount: any; residentName: string | null;
  provider: { contactEmail: string; contactName: string; businessName: string };
  family: { user: { firstName: string; lastName: string } } | null;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const APP_URL = process.env.NEXTAUTH_URL || "https://getcarelinkai.com";
  const passengerLabel = ride.residentName ?? (ride.family ? `${ride.family.user.firstName} ${ride.family.user.lastName}` : "Passenger");
  const scheduledStr = ride.scheduledAt.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
  await resend.emails.send({
    from: `CareLinkAI <${process.env.EMAIL_FROM || "noreply@getcarelinkai.com"}>`,
    to: [ride.provider.contactEmail],
    subject: `Payment Received — Ride Confirmed for ${scheduledStr}`,
    html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
      <div style="background:#16a34a;padding:24px;border-radius:8px 8px 0 0">
        <h1 style="color:#fff;margin:0;font-size:20px">Payment Received — Ride Confirmed</h1>
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">
        <p>Hi ${ride.provider.contactName},</p>
        <p>Payment has been received and the following ride is now confirmed:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px 0;color:#6b7280;width:140px">Passenger</td><td style="padding:8px 0;font-weight:600">${passengerLabel}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Scheduled</td><td style="padding:8px 0;font-weight:600">${scheduledStr}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Pickup</td><td style="padding:8px 0">${ride.pickupAddress}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Dropoff</td><td style="padding:8px 0">${ride.dropoffAddress}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Total Collected</td><td style="padding:8px 0;font-weight:700">$${Number(ride.totalAmount).toFixed(2)}</td></tr>
        </table>
        <a href="${APP_URL}/rides" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
          View Ride Dashboard →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">CareLinkAI · Cleveland, OH</p>
      </div>
    </div>`,
  });
}
