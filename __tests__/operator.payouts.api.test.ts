import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock next-auth
jest.mock("next-auth");

// Mock prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    operator: {
      findUnique: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock logger (OL-185: every transfer is logged with its computed basis)
jest.mock("@/lib/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// Mock stripe
jest.mock("@/lib/stripe", () => ({
  stripe: {
    accounts: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
  },
}));

// Import mocked modules
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

// Mock environment variables
process.env.APP_URL = "https://test.example.com";

// Import handlers to test
import { POST as startConnectHandler } from "@/app/api/operator/payouts/connect/start/route";
import { GET as statusConnectHandler } from "@/app/api/operator/payouts/connect/status/route";
import { POST as requestPayoutHandler } from "@/app/api/operator/payouts/request/route";

describe("Operator Payouts API", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Mock request object
  const mockRequest = {
    json: jest.fn(),
  } as unknown as Request;

  describe("POST /api/operator/payouts/connect/start", () => {
    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const response = await startConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 if user is not an operator", async () => {
      // Mock authenticated session with wrong role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "FAMILY" },
      });

      const response = await startConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "Only operators can access payout features" });
    });

    it("should return 404 if operator record is not found", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR" },
      });

      // Mock operator not found
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await startConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: "Operator record not found" });
    });

    it("should create a new Stripe Connect account if none exists", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR", email: "operator@example.com" },
      });

      // Mock operator found with no Connect account
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "operator-123",
        userId: "user-123",
        companyName: "Test Company",
        user: {
          id: "user-123",
          email: "operator@example.com",
          preferences: {},
        },
      });

      // Mock Stripe account creation
      (stripe.accounts.create as jest.Mock).mockResolvedValueOnce({
        id: "acct_123",
      });

      // Mock user preferences update
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        id: "user-123",
        preferences: {
          stripeConnectAccountId: "acct_123",
        },
      });

      // Mock account link creation
      (stripe.accountLinks.create as jest.Mock).mockResolvedValueOnce({
        url: "https://connect.stripe.com/setup/123",
      });

      const response = await startConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        url: "https://connect.stripe.com/setup/123",
      });

      // Verify Stripe account was created
      expect(stripe.accounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "express",
          email: "operator@example.com",
          metadata: expect.objectContaining({
            userId: "user-123",
            operatorId: "operator-123",
          }),
        })
      );

      // Verify user preferences were updated
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          preferences: {
            stripeConnectAccountId: "acct_123",
          },
        },
      });
    });

    it("should reuse existing Connect account if one exists", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR" },
      });

      // Mock operator found with existing Connect account
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "operator-123",
        userId: "user-123",
        user: {
          id: "user-123",
          preferences: {
            stripeConnectAccountId: "acct_existing",
          },
        },
      });

      // Mock account link creation
      (stripe.accountLinks.create as jest.Mock).mockResolvedValueOnce({
        url: "https://connect.stripe.com/setup/existing",
      });

      const response = await startConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        url: "https://connect.stripe.com/setup/existing",
      });

      // Verify Stripe account was not created
      expect(stripe.accounts.create).not.toHaveBeenCalled();

      // Verify account link was created with existing account ID
      expect(stripe.accountLinks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          account: "acct_existing",
        })
      );
    });
  });

  describe("GET /api/operator/payouts/connect/status", () => {
    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const response = await statusConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 if user is not an operator", async () => {
      // Mock authenticated session with wrong role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "CAREGIVER" },
      });

      const response = await statusConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "Only operators can access payout features" });
    });

    it("should return 404 if operator record is not found", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR" },
      });

      // Mock operator not found
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await statusConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: "Operator record not found" });
    });

    it("should return connected:false when no account exists", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR" },
      });

      // Mock operator found with no Connect account
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "operator-123",
        userId: "user-123",
        user: {
          id: "user-123",
          preferences: {},
        },
      });

      const response = await statusConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        connected: false,
        detailsSubmitted: false,
        chargesEnabled: false,
        payoutsEnabled: false,
      });

      // Verify Stripe account was not retrieved
      expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
    });

    it("should return account status flags when account exists", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR" },
      });

      // Mock operator found with existing Connect account
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce({
        id: "operator-123",
        userId: "user-123",
        user: {
          id: "user-123",
          preferences: {
            stripeConnectAccountId: "acct_123",
          },
        },
      });

      // Mock Stripe account retrieval
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({
        id: "acct_123",
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: false,
      });

      const response = await statusConnectHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        connected: true,
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: false,
      });

      // Verify Stripe account was retrieved
      expect(stripe.accounts.retrieve).toHaveBeenCalledWith("acct_123");
    });
  });

  describe("POST /api/operator/payouts/request", () => {
    // OL-185: the balance is computed inside a transaction under an advisory lock.
    const tx = {
      $executeRaw: jest.fn(),
      payment: { aggregate: jest.fn(), create: jest.fn() },
    };
    const connectedOperator = {
      id: "operator-123",
      userId: "user-123",
      user: { id: "user-123", preferences: { stripeConnectAccountId: "acct_123" } },
    };
    // earnings = Care Wallet booking payments; payouts = prior OPERATOR_PAYOUT rows.
    function ledger(earnings: number | null, priorPayouts: number | null, counts = { earnings: 2, payouts: 1 }) {
      tx.payment.aggregate
        .mockResolvedValueOnce({ _sum: { amount: earnings }, _count: { _all: counts.earnings } })
        .mockResolvedValueOnce({ _sum: { amount: priorPayouts }, _count: { _all: counts.payouts } });
    }
    function signedInConnected() {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user-123", role: "OPERATOR" } });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(connectedOperator);
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({ id: "acct_123", payouts_enabled: true });
    }

    beforeEach(() => {
      (mockRequest.json as jest.Mock).mockResolvedValue({ amount: 100.50, description: "Test payout" });
      (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => fn(tx));
      tx.payment.create.mockResolvedValue({ id: "payout-1" });
    });

    it("should return 401 if user is not authenticated", async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    it("should return 403 if user is not an operator", async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user-123", role: "FAMILY" } });
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Only operators can request payouts" });
    });

    it("should return 400 if request data is invalid", async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user-123", role: "OPERATOR" } });
      (mockRequest.json as jest.Mock).mockResolvedValueOnce({ amount: -50 });
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid request data");
      expect(data.details).toBeDefined();
    });

    it("should return 404 if operator record is not found", async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user-123", role: "OPERATOR" } });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Operator record not found" });
    });

    it("should return 400 if no Connect account exists", async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user-123", role: "OPERATOR" } });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce({ ...connectedOperator, user: { id: "user-123", preferences: {} } });
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "No connected account found. Please complete onboarding first." });
    });

    it("should return 400 if payouts are not enabled", async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "user-123", role: "OPERATOR" } });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(connectedOperator);
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({ id: "acct_123", payouts_enabled: false });
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Payouts are not enabled for your account. Please complete account verification." });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("rejects with 400 when the computed balance is zero — no reservation, no transfer", async () => {
      signedInConnected();
      ledger(null, null, { earnings: 0, payouts: 0 });
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "No payable balance", payableBalance: 0 });
      expect(tx.payment.create).not.toHaveBeenCalled();
      expect(stripe.transfers.create).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith("payout_rejected", expect.objectContaining({ reason: "no_balance", requestedCents: 10050, payableCents: 0 }));
    });

    it("rejects with 400 when the amount exceeds earnings minus prior payouts", async () => {
      signedInConnected();
      ledger(500, 450); // $50 payable, $100.50 requested
      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Requested amount exceeds your payable balance", payableBalance: 50 });
      expect(tx.payment.create).not.toHaveBeenCalled();
      expect(stripe.transfers.create).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith("payout_rejected", expect.objectContaining({
        reason: "exceeds_balance", earningsCents: 50000, priorPayoutsCents: 45000, payableCents: 5000,
      }));
    });

    it("computes the balance under a per-operator advisory lock from the right ledger rows", async () => {
      signedInConnected();
      ledger(1000, 0);
      (stripe.transfers.create as jest.Mock).mockResolvedValueOnce({ id: "tr_123", status: "pending" });
      await requestPayoutHandler(mockRequest as Request);
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
      expect((tx.$executeRaw as jest.Mock).mock.calls[0].slice(1)).toEqual(["payout:operator:operator-123"]);
      expect(tx.payment.aggregate).toHaveBeenNthCalledWith(1, expect.objectContaining({
        where: {
          bookingId: { not: null },
          status: "COMPLETED",
          type: { in: ["DEPOSIT", "MONTHLY_FEE"] },
          booking: { home: { operatorId: "operator-123" } },
        },
      }));
      expect(tx.payment.aggregate).toHaveBeenNthCalledWith(2, expect.objectContaining({
        where: { userId: "user-123", type: "OPERATOR_PAYOUT", status: { in: ["PENDING", "PROCESSING", "COMPLETED"] } },
      }));
    });

    it("pays exactly the payable balance: reserves the payout, transfers, records and logs the basis", async () => {
      signedInConnected();
      (mockRequest.json as jest.Mock).mockResolvedValueOnce({ amount: 100.50, description: "Test payout" });
      ledger(300.50, 200); // payable $100.50 == requested
      (stripe.transfers.create as jest.Mock).mockResolvedValueOnce({ id: "tr_123", amount: 10050, status: "pending" });

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ transferId: "tr_123", amount: 100.50, status: "pending" });

      expect(tx.payment.create).toHaveBeenCalledWith({
        data: { userId: "user-123", amount: 100.50, type: "OPERATOR_PAYOUT", status: "PENDING", description: "Test payout" },
        select: { id: true },
      });
      expect(stripe.transfers.create).toHaveBeenCalledWith(
        {
          amount: 10050,
          currency: "usd",
          destination: "acct_123",
          metadata: expect.objectContaining({ userId: "user-123", operatorId: "operator-123", payoutPaymentId: "payout-1" }),
        },
        { idempotencyKey: "operator-payout-payout-1" }
      );
      expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: "payout-1" }, data: { status: "PROCESSING", stripePaymentId: "tr_123" } });
      expect(logger.info).toHaveBeenCalledWith("payout_transfer", {
        role: "OPERATOR",
        operatorId: "operator-123",
        payoutPaymentId: "payout-1",
        transferId: "tr_123",
        requestedCents: 10050,
        ledger: "operator_care_wallet",
        earningsCents: 30050,
        earningCount: 2,
        priorPayoutsCents: 20000,
        payoutCount: 1,
        payableCents: 10050,
      });
    });

    it("marks the reservation FAILED (releasing the balance) and returns 500 when the transfer fails", async () => {
      signedInConnected();
      ledger(1000, 0);
      (stripe.transfers.create as jest.Mock).mockRejectedValueOnce(new Error("insufficient platform balance"));
      (prisma.payment.update as jest.Mock).mockResolvedValue({});

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response.status).toBe(500);
      expect(prisma.payment.update).toHaveBeenCalledWith({ where: { id: "payout-1" }, data: { status: "FAILED" } });
      expect(logger.error).toHaveBeenCalledWith("payout_transfer_failed", expect.objectContaining({ payoutPaymentId: "payout-1", requestedCents: 10050 }));
    });
  });
});
