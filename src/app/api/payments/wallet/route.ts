export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/payments/wallet
 * 
 * Retrieves the family wallet information
 * Creates wallet if it doesn't exist
 * Requires authentication and FAMILY role
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has FAMILY role
    if (session.user.role !== "FAMILY") {
      return NextResponse.json({ error: "Only family users can access wallet" }, { status: 403 });
    }

    // Find family record for current user
    const family = await prisma.family.findUnique({
      where: { userId: session.user.id },
      include: { wallet: true }
    });

    if (!family) {
      return NextResponse.json({ error: "Family record not found" }, { status: 404 });
    }

    // If wallet doesn't exist, create one
    let wallet = family.wallet;
    if (!wallet) {
      wallet = await prisma.familyWallet.create({
        data: {
          familyId: family.id,
          balance: 0,
        }
      });
    }

    // Return wallet information
    return NextResponse.json({
      wallet: {
        id: wallet.id,
        familyId: wallet.familyId,
        balance: wallet.balance,
      }
    });

  } catch (error) {
    console.error("Error retrieving wallet:", error);
    return NextResponse.json(
      { error: "Failed to retrieve wallet" },
      { status: 500 }
    );
  }
}
