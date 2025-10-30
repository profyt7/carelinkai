import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * POST /api/timesheets/[id]/pay
 * 
 * Initiates payment for an approved timesheet to the caregiver's Stripe Connect account
 * Creates a transfer and updates the payment record with the transfer ID
 * 
 * Requires authentication and operator role
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Timesheet ID is required" }, { status: 400 });
    }

    // Find the timesheet with all necessary relations
    const timesheet = await prisma.timesheet.findUnique({
      where: { id },
      include: {
        shift: {
          include: {
            home: {
              select: {
                operatorId: true
              }
            }
          }
        },
        caregiver: {
          include: {
            user: {
              select: {
                id: true,
                preferences: true
              }
            }
          }
        }
      }
    });

    // Check if timesheet exists
    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    // Check if timesheet is associated with a shift in a home operated by this operator
    if (timesheet.shift?.home?.operatorId !== operator.id) {
      return NextResponse.json({ 
        error: "You don't have permission to pay this timesheet" 
      }, { status: 403 });
    }

    // Check if timesheet is in APPROVED status
    if (timesheet.status !== "APPROVED") {
      return NextResponse.json({ 
        error: "Only timesheets with APPROVED status can be paid",
        currentStatus: timesheet.status
      }, { status: 409 });
    }

    // Ensure the timesheet has been ended (endTime present)
    if (!timesheet.endTime) {
      return NextResponse.json(
        { error: "Cannot pay a timesheet that has not been ended yet" },
        { status: 409 }
      );
    }

    // Find the MarketplaceHire by shiftId
    const hire = await prisma.marketplaceHire.findUnique({
      where: { shiftId: timesheet.shiftId ?? undefined }
    });

    if (!hire) {
      return NextResponse.json(
        { error: "No marketplace hire associated with this shift. Payment cannot be processed." },
        { status: 409 }
      );
    }

    // Find existing Payment or compute and create one
    let payment = await prisma.payment.findUnique({
      where: { marketplaceHireId: hire.id }
    });

    if (!payment) {
      // Compute payable hours and amount
      const start = timesheet.startTime;
      const end = timesheet.endTime;
      const breakMs = (timesheet.breakMinutes ?? 0) * 60_000;
      const durationMs = Math.max(0, end.getTime() - start.getTime() - breakMs);
      const hoursWorked = durationMs / 3_600_000;

      // Calculate amount using shift hourlyRate
      const rate = Number(timesheet.shift?.hourlyRate ?? 0);
      const rawAmount = hoursWorked * rate;
      const amount = parseFloat(rawAmount.toFixed(2)); // round to 2 decimals

      // Create payment record
      payment = await prisma.payment.create({
        data: {
          userId: session.user.id,
          amount,
          type: "CAREGIVER_PAYMENT",
          status: "PENDING",
          description: `Payroll for timesheet ${id}`,
          marketplaceHireId: hire.id
        }
      });
    }

    // Check if payment is already processed
    if (payment.status === "COMPLETED") {
      return NextResponse.json({ 
        error: "This timesheet has already been paid",
        paymentId: payment.id,
        stripePaymentId: payment.stripePaymentId
      }, { status: 409 });
    }

    // Validate caregiver has a Stripe Connect account
    const caregiverPreferences = timesheet.caregiver?.user?.preferences as any || {};
    const connectAccountId = caregiverPreferences.stripeConnectAccountId as string | undefined;
    
    if (!connectAccountId) {
      return NextResponse.json(
        { error: "Caregiver does not have a Stripe Connect account set up" },
        { status: 400 }
      );
    }

    // Verify the account and check if payouts are enabled
    const account = await stripe.accounts.retrieve(connectAccountId);
    if (!account.payouts_enabled) {
      return NextResponse.json(
        { error: "Payouts are not enabled for the caregiver's account" },
        { status: 400 }
      );
    }

    // Convert amount to cents for Stripe (supports Decimal or number)
    const amt =
      typeof (payment as any).amount === "number"
        ? (payment as any).amount
        : (payment as any).amount?.toNumber?.() ??
          Number((payment as any).amount);

    const amountInCents = Math.round(amt * 100);

    // Create a transfer to the caregiver's Connect account
    const transfer = await stripe.transfers.create({
      amount: amountInCents,
      currency: 'usd',
      destination: connectAccountId,
      metadata: {
        timesheetId: timesheet.id,
        shiftId: timesheet.shiftId,
        hireId: hire.id,
        operatorId: operator.id,
        caregiverId: timesheet.caregiverId
      }
    });

    // Update payment with transfer ID and set status to PROCESSING
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "PROCESSING",
        stripePaymentId: transfer.id
      }
    });

    // Return success response
    return NextResponse.json({
      success: true,
      transferId: transfer.id,
      paymentId: updatedPayment.id
    });

  } catch (error) {
    console.error("Error processing timesheet payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
