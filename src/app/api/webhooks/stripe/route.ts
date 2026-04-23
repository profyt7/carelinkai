
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { bindRequestLogger } from "@/lib/logger";
import { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

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
      const operator = await findOperatorByCustomer(customerId);

      if (!operator) {
        // Customer may belong to the family wallet system — ignore gracefully
        logger.info("Subscription event for unknown operator customer", { customerId, subscriptionId: sub.id });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      const plan = resolvePlan(sub.metadata, sub.items);
      const status = mapSubscriptionStatus(sub.status);
      const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000) : null;
      const currentPeriodEndsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

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

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const operator = await findOperatorByCustomer(customerId);

      if (!operator) {
        logger.info("Subscription deletion for unknown operator customer", { customerId });
        return NextResponse.json({ received: true }, { status: 200 });
      }

      await prisma.operator.update({
        where: { id: operator.id },
        data: { subscriptionStatus: SubscriptionStatus.CANCELED },
      });

      logger.info("Operator subscription canceled", { operatorId: operator.id });
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

      logger.info("Operator invoice payment succeeded", { operatorId: operator.id, invoiceId: invoice.id });
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

      logger.info("Operator invoice payment failed", { operatorId: operator.id, invoiceId: invoice.id });
      return NextResponse.json({ received: true }, { status: 200 });
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
    logger.error("Error processing Stripe webhook", { err: error instanceof Error ? error.message : error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
