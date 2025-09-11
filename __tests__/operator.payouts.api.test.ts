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
  },
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
    beforeEach(() => {
      // Mock request body for all tests in this suite
      (mockRequest.json as jest.Mock).mockResolvedValue({
        amount: 100.50,
        description: "Test payout",
      });
    });

    it("should return 401 if user is not authenticated", async () => {
      // Mock unauthenticated session
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const response = await requestPayoutHandler(mockRequest as Request);
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

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "Only operators can request payouts" });
    });

    it("should return 400 if request data is invalid", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR" },
      });

      // Mock invalid request body
      (mockRequest.json as jest.Mock).mockResolvedValueOnce({
        amount: -50, // Invalid: negative amount
      });

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBe("Invalid request data");
      expect(data.details).toBeDefined();
    });

    it("should return 404 if operator record is not found", async () => {
      // Mock authenticated session with operator role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-123", role: "OPERATOR" },
      });

      // Mock operator not found
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: "Operator record not found" });
    });

    it("should return 400 if no Connect account exists", async () => {
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

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toEqual({ 
        error: "No connected account found. Please complete onboarding first." 
      });
    });

    it("should return 400 if payouts are not enabled", async () => {
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

      // Mock Stripe account retrieval with payouts disabled
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({
        id: "acct_123",
        payouts_enabled: false,
      });

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toEqual({ 
        error: "Payouts are not enabled for your account. Please complete account verification." 
      });
    });

    it("should create a transfer and return transfer details on success", async () => {
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

      // Mock Stripe account retrieval with payouts enabled
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({
        id: "acct_123",
        payouts_enabled: true,
      });

      // Mock Stripe transfer creation
      (stripe.transfers.create as jest.Mock).mockResolvedValueOnce({
        id: "tr_123",
        amount: 10050, // In cents
        status: "pending",
      });

      const response = await requestPayoutHandler(mockRequest as Request);
      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        transferId: "tr_123",
        amount: 100.50,
        status: "pending",
      });

      // Verify transfer was created with correct parameters
      expect(stripe.transfers.create).toHaveBeenCalledWith({
        amount: 10050, // 100.50 converted to cents
        currency: "usd",
        destination: "acct_123",
        metadata: expect.objectContaining({
          userId: "user-123",
          operatorId: "operator-123",
          description: "Test payout",
        }),
      });
    });
  });
});
