import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 * 
 * Handles Stripe webhook events, specifically payment_intent.succeeded
 * Updates wallet balance and creates payment records
 */
export async function POST(request: NextRequest) {
  try {
    // Get the raw body as text
    const rawBody = await request.text();
    
    // Get the signature header
    const signature = request.headers.get("stripe-signature");
    
    let event: Stripe.Event;
    
    // Verify webhook signature if secret is set
    if (process.env.STRIPE_WEBHOOK_SECRET && signature) {
      try {
        event = stripe.webhooks.constructEvent(
          rawBody,
          signature,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        console.error("⚠️ Webhook signature verification failed:", err);
        return NextResponse.json(
          { error: "Webhook signature verification failed" },
          { status: 400 }
        );
      }
    } else {
      // In development, bypass signature verification
      try {
        event = JSON.parse(rawBody) as Stripe.Event;
        console.log("⚠️ Webhook signature verification bypassed (development mode)");
      } catch (err) {
        console.error("⚠️ Invalid webhook payload:", err);
        return NextResponse.json(
          { error: "Invalid webhook payload" },
          { status: 400 }
        );
      }
    }
    
    // Only handle payment_intent.succeeded events
    if (event.type !== "payment_intent.succeeded") {
      return NextResponse.json(
        { received: true, message: "Ignored event type" },
        { status: 200 }
      );
    }
    
    // Cast the event data to PaymentIntent
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    
    // Extract payment details
    const stripePaymentId = paymentIntent.id;
    const amount = paymentIntent.amount; // in cents
    const currency = paymentIntent.currency;
    const metadata = paymentIntent.metadata || {};
    const familyId = metadata.familyId;
    const walletId = metadata.walletId;
    const userId = metadata.userId;
    
    // Validate required metadata
    if (!familyId || !userId) {
      console.error("⚠️ Missing required metadata:", { familyId, userId });
      return NextResponse.json(
        { error: "Missing required metadata" },
        { status: 400 }
      );
    }
    
    // Check for idempotency - if payment already processed, return success
    const existingPayment = await prisma.payment.findFirst({
      where: { stripePaymentId },
    });
    
    if (existingPayment) {
      console.log(`✅ Payment ${stripePaymentId} already processed, skipping`);
      return NextResponse.json(
        { received: true, message: "Payment already processed" },
        { status: 200 }
      );
    }
    
    // Process the payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create wallet
      let wallet;
      
      if (walletId) {
        wallet = await tx.familyWallet.findUnique({
          where: { id: walletId },
        });
        
        if (!wallet) {
          console.log(`⚠️ Wallet ${walletId} not found, looking up by familyId`);
        }
      }
      
      // If wallet not found by ID, try to find by familyId
      if (!wallet) {
        wallet = await tx.familyWallet.findFirst({
          where: { familyId },
        });
      }
      
      // If still no wallet, create one
      if (!wallet) {
        console.log(`⚠️ No wallet found for family ${familyId}, creating new wallet`);
        wallet = await tx.familyWallet.create({
          data: {
            familyId,
            balance: 0, // Will be updated below
          },
        });
      }
      
      // Convert amount from cents to dollars for storage
      const amountDecimal = amount / 100;
      
      // Update wallet balance
      const newBalance = parseFloat(wallet.balance.toString()) + amountDecimal;
      
      const updatedWallet = await tx.familyWallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });
      
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          familyId,
          userId,
          amount: amountDecimal,
          currency,
          type: "DEPOSIT",
          status: "SUCCEEDED",
          stripePaymentId,
        },
      });
      
      // Create wallet transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "DEPOSIT",
          amount: amountDecimal,
          currency,
          balanceAfter: newBalance,
        },
      });
      
      return {
        payment,
        wallet: updatedWallet,
        transaction,
      };
    });
    
    console.log(`✅ Payment processed: ${stripePaymentId}, wallet updated`);
    
    return NextResponse.json(
      { received: true, success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
