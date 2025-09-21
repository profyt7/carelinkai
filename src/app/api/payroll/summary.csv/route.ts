import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * GET /api/payroll/summary.csv
 *
 * Returns caregiver payments as a CSV file for the authenticated operator
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
      select: { id: true },
    });

    if (!operator) {
      return NextResponse.json(
        { error: "User is not registered as an operator" },
        { status: 403 }
      );
    }

    // Query all caregiver payments for this operator's homes
    const payments = await prisma.payment.findMany({
      where: {
        type: "CAREGIVER_PAYMENT",
        marketplaceHire: {
          shift: {
            home: {
              operatorId: operator.id,
            },
          },
        },
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
                id: true,
              },
            },
          },
        },
      },
    });

    // Build CSV header
    let csv = "paymentId,status,amount,transferId,hireId,shiftId,caregiverId\n";

    // Add data rows
    for (const payment of payments) {
      // Convert Decimal to number safely and format to 2 decimal places
      const amountNum =
        typeof payment.amount === "number"
          ? payment.amount
          : payment.amount?.toNumber?.()
          ? payment.amount.toNumber()
          : Number(payment.amount) || 0;
      const amount = amountNum.toFixed(2);

      // Get related IDs
      const hireId = payment.marketplaceHireId || "";
      const caregiverId = payment.marketplaceHire?.caregiverId || "";
      const shiftId = payment.marketplaceHire?.shift?.id || "";
      const transferId = payment.stripePaymentId || "";

      // Add row to CSV
      csv += `${payment.id},${payment.status},${amount},${transferId},${hireId},${shiftId},${caregiverId}\n`;
    }

    // Return CSV with appropriate headers
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="payroll-summary.csv"',
      },
    });
  } catch (error) {
    console.error("Error generating payroll CSV:", error);
    return NextResponse.json(
      { error: "Failed to generate payroll CSV" },
      { status: 500 }
    );
  }
}