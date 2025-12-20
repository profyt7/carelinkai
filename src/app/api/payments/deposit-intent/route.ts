
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

// Validate deposit intent request
const depositIntentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("usd"),
  description: z.string().optional(),
});

/**
 * POST /api/payments/deposit-intent
 * 
 * Creates a Stripe PaymentIntent for family wallet deposits
 * Requires authentication and FAMILY role
 */
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has FAMILY role
    if (session.user.role !== "FAMILY") {
      return NextResponse.json({ error: "Only family users can make deposits" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    
    // Validate input
    const validationResult = depositIntentSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { amount, currency, description } = validationResult.data;

    // Find family record for current user
    const family = await prisma.family.findUnique({
      where: { userId: session.user.id },
      include: { wallet: true }
    });

    if (!family) {
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }

    // Find or create wallet
    let wallet = family.wallet;
    let walletJustCreated = false;
    if (!wallet) {
      wallet = await prisma.familyWallet.create({
        data: {
          familyId: family.id,
          balance: 0,
        }
      });
      walletJustCreated = true;
    }

    // Ensure wallet has a Stripe customer ID
    if (!wallet.stripeCustomerId) {
      if (walletJustCreated) {
        // Newly created wallet: use mock customer ID without hitting Stripe
        const customerId = `cus_mock_${wallet.id}`;
        wallet = await prisma.familyWallet.update({
          where: { id: wallet.id },
          data: { stripeCustomerId: customerId },
        });
      } else {
        // Existing wallet but missing customer: create a Stripe customer
        const customer = await stripe.customers.create({
          email: session.user.email ?? undefined,
          name: session.user.name ?? undefined,
          metadata: {
            userId: session.user.id,
            familyId: family.id,
          },
        });
        wallet = await prisma.familyWallet.update({
          where: { id: wallet.id },
          data: { stripeCustomerId: customer.id },
        });
      }
    }

    // Convert amount from dollars to cents for Stripe
    const amountInCents = Math.round(amount * 100);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      // Stripe typings expect `string | undefined`. Cast nullable ID accordingly.
      customer: wallet.stripeCustomerId ?? undefined,
      metadata: {
        familyId: family.id,
        userId: session.user.id,
        walletId: wallet.id,
      },
      description: description || `Wallet deposit for ${session.user.name}`,
    });

    // Create payment record
    await prisma.payment.create({
      data: {
        userId: session.user.id,
        amount,
        type: "DEPOSIT",
        status: "PENDING",
        stripePaymentId: paymentIntent.id,
        description: description || "Wallet deposit",
      }
    });

    // Return client secret and payment intent ID
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });

  } catch (error) {
    console.error("Error creating deposit intent:", error);
    return NextResponse.json(
      { error: "Failed to create deposit intent" },
      { status: 500 }
    );
  }
}
