
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";
import { bindRequestLogger } from "@/lib/logger";

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
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events, including payment_intent.succeeded and transfer.*
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
          logger.info({ msg: "Webhook signature bypassed (non-production)" });
        }
      } catch (err) {
        logger.error("Invalid webhook payload", { err: err instanceof Error ? err.message : err });
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
    }
    // Handle transfer.* events for caregiver payouts reconciliation
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

      // Update by stored stripePaymentId
      const byId = await prisma.payment.updateMany({
        where: { stripePaymentId: transferId, type: "CAREGIVER_PAYMENT" },
        data: { status: newStatus },
      });

      let updatedCount = byId.count;

      // Fallback: locate by MarketplaceHire (metadata.hireId)
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

    // Only handle payment_intent.succeeded events
    if (event.type !== "payment_intent.succeeded") {
      return NextResponse.json({ received: true, message: "Ignored event type" }, { status: 200 });
    }

    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const stripePaymentId = paymentIntent.id;
    const amount = paymentIntent.amount; // in cents
    const currency = paymentIntent.currency;
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

    // Process atomically
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