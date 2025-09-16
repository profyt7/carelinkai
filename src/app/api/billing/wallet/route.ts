export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership } from "@/lib/services/family";

/**
 * GET /api/billing/wallet
 * 
 * Retrieves wallet information and recent transactions for a family
 * Requires authentication and family membership
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const providedFamilyId = searchParams.get("familyId");

    // Determine effective familyId
    let effectiveFamilyId = providedFamilyId;
    
    if (!effectiveFamilyId) {
      // Find the first family membership for the user
      const membership = await prisma.familyMember.findFirst({
        where: { userId: session.user.id },
        select: { familyId: true }
      });
      
      if (!membership) {
        return NextResponse.json(
          { error: "No family found for user" },
          { status: 404 }
        );
      }
      
      effectiveFamilyId = membership.familyId;
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(
      session.user.id,
      effectiveFamilyId
    );
    
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Find or create wallet for the family
    let wallet = await prisma.familyWallet.findUnique({
      where: { familyId: effectiveFamilyId }
    });

    if (!wallet) {
      // Create a new wallet with default balance of 0
      wallet = await prisma.familyWallet.create({
        data: {
          familyId: effectiveFamilyId,
          balance: 0
        }
      });
    }

    // Fetch recent transactions
    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 25
    });

    // Return wallet info and transactions
    return NextResponse.json({
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        stripeCustomerId: wallet.stripeCustomerId
      },
      transactions
    });

  } catch (error) {
    console.error("Error fetching wallet information:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet information" },
      { status: 500 }
    );
  }
}
