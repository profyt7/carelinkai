/**
 * Tests for Caregiver Payouts API
 * 
 * Tests the endpoints:
 * - POST /api/caregiver/payouts/connect/start
 * - GET /api/caregiver/payouts/connect/status
 * - POST /api/caregiver/payouts/request
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST as startConnect } from '@/app/api/caregiver/payouts/connect/start/route';
import { GET as getConnectStatus } from '@/app/api/caregiver/payouts/connect/status/route';
import { POST as requestPayout } from '@/app/api/caregiver/payouts/request/route';

// Mock Next Auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      caregiver: {
        findUnique: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      }
    }
  };
});

// Mock Stripe
jest.mock('@/lib/stripe', () => {
  return {
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
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Helper to create a mock NextRequest for POST
function createMockPostRequest(body = {}) {
  const request = {
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

// Helper to create a mock NextRequest for GET
function createMockGetRequest() {
  const request = {} as unknown as NextRequest;
  return request;
}

describe('Caregiver Payouts API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'caregiver@example.com',
    name: 'Caregiver User',
    role: 'CAREGIVER',
  };
  
  const mockCaregiverId = 'caregiver-123';
  
  const mockCaregiver = {
    id: mockCaregiverId,
    userId: mockUser.id,
    user: {
      id: mockUser.id,
      email: mockUser.email,
      name: mockUser.name,
      preferences: {},
    }
  };
  
  const mockCaregiverWithConnectAccount = {
    ...mockCaregiver,
    user: {
      ...mockCaregiver.user,
      preferences: {
        stripeConnectAccountId: 'acct_123',
      },
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/caregiver/payouts/connect/start', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockPostRequest();
      const response = await startConnect(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, role: 'FAMILY' },
      });
      
      const request = createMockPostRequest();
      const response = await startConnect(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Only caregivers can access payout features" });
    });
    
    test('returns 404 when caregiver record is not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockPostRequest();
      const response = await startConnect(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Caregiver record not found" });
    });
    
    test('creates a new account and returns onboarding link when no account exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      const mockAccount = {
        id: 'acct_new123',
      };
      
      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/s/mock-onboarding-link',
      };
      
      (stripe.accounts.create as jest.Mock).mockResolvedValueOnce(mockAccount);
      (stripe.accountLinks.create as jest.Mock).mockResolvedValueOnce(mockAccountLink);
      (prisma.user.update as jest.Mock).mockResolvedValueOnce({
        ...mockCaregiver.user,
        preferences: {
          stripeConnectAccountId: mockAccount.id,
        },
      });
      
      const request = createMockPostRequest();
      const response = await startConnect(request);
      
      expect(response.status).toBe(200);
      
      // Verify account was created
      expect(stripe.accounts.create).toHaveBeenCalledWith({
        type: 'express',
        country: 'US',
        email: mockUser.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          mcc: '8050',
          product_description: 'Caregiving services',
        },
        metadata: {
          userId: mockUser.id,
          caregiverId: mockCaregiverId,
        },
      });
      
      // Verify user preferences were updated
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          preferences: {
            stripeConnectAccountId: mockAccount.id,
          },
        },
      });
      
      // Verify account link was created
      expect(stripe.accountLinks.create).toHaveBeenCalledWith({
        account: mockAccount.id,
        refresh_url: expect.any(String),
        return_url: expect.any(String),
        type: 'account_onboarding',
      });
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        url: mockAccountLink.url,
      });
    });
    
    test('uses existing account and returns onboarding link when account exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiverWithConnectAccount);
      
      const mockAccountLink = {
        url: 'https://connect.stripe.com/setup/s/mock-onboarding-link',
      };
      
      (stripe.accountLinks.create as jest.Mock).mockResolvedValueOnce(mockAccountLink);
      
      const request = createMockPostRequest();
      const response = await startConnect(request);
      
      expect(response.status).toBe(200);
      
      // Verify account was NOT created
      expect(stripe.accounts.create).not.toHaveBeenCalled();
      
      // Verify user preferences were NOT updated
      expect(prisma.user.update).not.toHaveBeenCalled();
      
      // Verify account link was created with existing account ID
      expect(stripe.accountLinks.create).toHaveBeenCalledWith({
        account: 'acct_123',
        refresh_url: expect.any(String),
        return_url: expect.any(String),
        type: 'account_onboarding',
      });
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        url: mockAccountLink.url,
      });
    });
  });
  
  describe('GET /api/caregiver/payouts/connect/status', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockGetRequest();
      const response = await getConnectStatus(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, role: 'FAMILY' },
      });
      
      const request = createMockGetRequest();
      const response = await getConnectStatus(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Only caregivers can access payout features" });
    });
    
    test('returns 404 when caregiver record is not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockGetRequest();
      const response = await getConnectStatus(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Caregiver record not found" });
    });
    
    test('returns connected:false when no Connect account exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      const request = createMockGetRequest();
      const response = await getConnectStatus(request);
      
      expect(response.status).toBe(200);
      
      // Verify account was NOT retrieved
      expect(stripe.accounts.retrieve).not.toHaveBeenCalled();
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        connected: false,
      });
    });
    
    test('returns account status when Connect account exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiverWithConnectAccount);
      
      const mockAccount = {
        id: 'acct_123',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true,
      };
      
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce(mockAccount);
      
      const request = createMockGetRequest();
      const response = await getConnectStatus(request);
      
      expect(response.status).toBe(200);
      
      // Verify account was retrieved
      expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_123');
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        connected: true,
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: true,
      });
    });
  });
  
  describe('POST /api/caregiver/payouts/request', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockPostRequest({ amount: 100 });
      const response = await requestPayout(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, role: 'FAMILY' },
      });
      
      const request = createMockPostRequest({ amount: 100 });
      const response = await requestPayout(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Only caregivers can request payouts" });
    });
    
    test('returns 400 when amount is invalid', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      const request = createMockPostRequest({ amount: -50 });
      const response = await requestPayout(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid input');
    });
    
    test('returns 404 when caregiver record is not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockPostRequest({ amount: 100 });
      const response = await requestPayout(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Caregiver record not found" });
    });
    
    test('returns 400 when no Connect account exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      const request = createMockPostRequest({ amount: 100 });
      const response = await requestPayout(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "No connected Stripe account found. Please complete onboarding first." });
    });
    
    test('returns 400 when payouts are not enabled', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiverWithConnectAccount);
      
      const mockAccount = {
        id: 'acct_123',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: false, // Payouts not enabled
      };
      
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce(mockAccount);
      
      const request = createMockPostRequest({ amount: 100 });
      const response = await requestPayout(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Payouts are not enabled for your account. Please complete account verification." });
    });
    
    test('successfully creates transfer and payment record', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiverWithConnectAccount);
      
      const mockAccount = {
        id: 'acct_123',
        details_submitted: true,
        charges_enabled: true,
        payouts_enabled: true, // Payouts enabled
      };
      
      const mockTransfer = {
        id: 'tr_123',
        amount: 10000, // $100 in cents
        currency: 'usd',
      };
      
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce(mockAccount);
      (stripe.transfers.create as jest.Mock).mockResolvedValueOnce(mockTransfer);
      
      (prisma.payment.create as jest.Mock).mockResolvedValueOnce({
        id: 'payment-123',
        userId: mockUser.id,
        amount: 100,
        type: 'CAREGIVER_PAYMENT',
        status: 'PROCESSING',
        stripePaymentId: mockTransfer.id,
      });
      
      const request = createMockPostRequest({ 
        amount: 100,
        currency: 'usd',
        description: 'Test payout'
      });
      
      const response = await requestPayout(request);
      
      expect(response.status).toBe(200);
      
      // Verify account was retrieved
      expect(stripe.accounts.retrieve).toHaveBeenCalledWith('acct_123');
      
      // Verify transfer was created
      expect(stripe.transfers.create).toHaveBeenCalledWith({
        amount: 10000, // $100 in cents
        currency: 'usd',
        destination: 'acct_123',
        metadata: {
          caregiverId: mockCaregiverId,
          userId: mockUser.id,
        },
        description: 'Test payout',
      });
      
      // Verify payment record was created
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          amount: 100,
          type: 'CAREGIVER_PAYMENT',
          status: 'PROCESSING',
          stripePaymentId: mockTransfer.id,
          description: 'Test payout',
        }),
      });
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        transferId: mockTransfer.id,
      });
    });
  });
});
