import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * GET /api/payroll/summary
 * 
 * Returns aggregated payroll totals for the authenticated operator
 * Grouped by payment status (PENDING, PROCESSING, COMPLETED, FAILED)
 * 
 * Requires authentication and operator role
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find operator record for current user
    const operator = await prisma.operator.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!operator) {
      return NextResponse.json({ error: "User is not registered as an operator" }, { status: 403 });
    }

    // Query all caregiver payments for this operator's homes
    const payments = await prisma.payment.findMany({
      where: {
        type: "CAREGIVER_PAYMENT",
        marketplaceHire: {
          shift: {
            home: {
              operatorId: operator.id
            }
          }
        }
      },
      select: {
        id: true,
        status: true,
        amount: true,
        stripePaymentId: true,
        marketplaceHireId: true,
        marketplaceHire: {
          select: {
            caregiverId: true,
            shift: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    // Initialize totals object with all statuses
    const totals = {
      pending: { count: 0, amount: 0 },
      processing: { count: 0, amount: 0 },
      completed: { count: 0, amount: 0 },
      failed: { count: 0, amount: 0 }
    };

    // Aggregate by status
    for (const payment of payments) {
      // Convert Decimal to number safely
      const amount = typeof payment.amount === 'number' 
        ? payment.amount 
        : payment.amount?.toNumber?.() ?? Number(payment.amount) ?? 0;

      // Map status to lowercase key in totals object
      const statusKey = payment.status.toLowerCase() as keyof typeof totals;
      
      if (totals[statusKey]) {
        totals[statusKey].count += 1;
        totals[statusKey].amount += amount;
        // Round to 2 decimal places for currency
        totals[statusKey].amount = parseFloat(totals[statusKey].amount.toFixed(2));
      }
    }

    // Return the aggregated totals
    return NextResponse.json({ 
      totals,
      // Include raw payment data for debugging/validation
      payments: payments.map(p => ({
        ...p,
        amount: typeof p.amount === 'number' 
          ? p.amount 
          : p.amount?.toNumber?.() ?? Number(p.amount) ?? 0
      }))
    });

  } catch (error) {
    console.error("Error fetching payroll summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch payroll summary" },
      { status: 500 }
    );
  }
}
