/**
 * Tests for Payments API
 * 
 * Tests the endpoints:
 * - POST /api/payments/deposit-intent
 * - GET /api/payments/wallet
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST as createDepositIntent } from '@/app/api/payments/deposit-intent/route';
import { GET as getWallet } from '@/app/api/payments/wallet/route';

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
      family: {
        findUnique: jest.fn(),
      },
      familyWallet: {
        create: jest.fn(),
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
      customers: {
        create: jest.fn(),
      },
      paymentIntents: {
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
  const url = new URL('https://example.com/api/payments/deposit-intent');
  
  const request = {
    nextUrl: url,
    method: 'POST',
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

// Helper to create a mock NextRequest for GET
function createMockGetRequest() {
  const url = new URL('https://example.com/api/payments/wallet');
  
  const request = {
    nextUrl: url,
    method: 'GET',
  } as unknown as NextRequest;
  
  return request;
}

describe('Payments API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'family@example.com',
    name: 'Family User',
    role: 'FAMILY',
  };
  
  const mockFamilyId = 'family-123';
  const mockWalletId = 'wallet-123';
  
  const mockFamily = {
    id: mockFamilyId,
    userId: mockUser.id,
    wallet: {
      id: mockWalletId,
      familyId: mockFamilyId,
      balance: 100.00,
      stripeCustomerId: 'cus_123',
    }
  };
  
  const mockFamilyWithoutWallet = {
    id: mockFamilyId,
    userId: mockUser.id,
    wallet: null,
  };
  
  const mockWallet = {
    id: mockWalletId,
    familyId: mockFamilyId,
    balance: 100.00,
    stripeCustomerId: 'cus_123',
  };
  
  const mockWalletWithoutStripeCustomer = {
    id: mockWalletId,
    familyId: mockFamilyId,
    balance: 100.00,
    stripeCustomerId: null,
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/payments/deposit-intent', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockPostRequest({ amount: 50 });
      const response = await createDepositIntent(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a family', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, role: 'CAREGIVER' },
      });
      
      const request = createMockPostRequest({ amount: 50 });
      const response = await createDepositIntent(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Only family users can make deposits" });
    });
    
    test('returns 404 when family record is not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockPostRequest({ amount: 50 });
      const response = await createDepositIntent(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Family record not found" });
    });
    
    test('returns 400 when amount is invalid', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      const request = createMockPostRequest({ amount: -50 });
      const response = await createDepositIntent(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid input');
    });
    
    test('creates wallet if it does not exist', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamilyWithoutWallet);
      
      const newWallet = {
        id: 'new-wallet-123',
        familyId: mockFamilyId,
        balance: 0,
        stripeCustomerId: null,
      };
      
      (prisma.familyWallet.create as jest.Mock).mockResolvedValueOnce(newWallet);
      
      const updatedWallet = {
        ...newWallet,
        stripeCustomerId: 'cus_mock_123',
      };
      
      (prisma.familyWallet.update as jest.Mock).mockResolvedValueOnce(updatedWallet);
      
      const mockPaymentIntent = {
        id: 'pi_mock_123',
        client_secret: 'pi_mock_secret_123',
        amount: 5000,
        currency: 'usd',
      };
      
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValueOnce(mockPaymentIntent);
      
      (prisma.payment.create as jest.Mock).mockResolvedValueOnce({
        id: 'payment-123',
        userId: mockUser.id,
        amount: 50,
        type: 'DEPOSIT',
        status: 'PENDING',
        stripePaymentId: mockPaymentIntent.id,
      });
      
      const request = createMockPostRequest({ amount: 50 });
      const response = await createDepositIntent(request);
      
      expect(response.status).toBe(200);
      
      // Verify wallet was created
      expect(prisma.familyWallet.create).toHaveBeenCalledWith({
        data: {
          familyId: mockFamilyId,
          balance: 0,
        }
      });
      
      // Verify customer ID was added
      expect(prisma.familyWallet.update).toHaveBeenCalled();
      
      // Verify payment was created
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          amount: 50,
          type: 'DEPOSIT',
          status: 'PENDING',
          stripePaymentId: mockPaymentIntent.id,
        }),
      });
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        clientSecret: mockPaymentIntent.client_secret,
        paymentIntentId: mockPaymentIntent.id,
      });
    });
    
    test('creates Stripe customer if it does not exist', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      // Family exists with wallet but no stripe customer ID
      const familyWithoutStripeCustomer = {
        ...mockFamily,
        wallet: mockWalletWithoutStripeCustomer,
      };
      
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(familyWithoutStripeCustomer);
      
      const mockCustomer = {
        id: 'cus_new_123',
      };
      
      (stripe.customers.create as jest.Mock).mockResolvedValueOnce(mockCustomer);
      
      const updatedWallet = {
        ...mockWalletWithoutStripeCustomer,
        stripeCustomerId: mockCustomer.id,
      };
      
      (prisma.familyWallet.update as jest.Mock).mockResolvedValueOnce(updatedWallet);
      
      const mockPaymentIntent = {
        id: 'pi_mock_123',
        client_secret: 'pi_mock_secret_123',
        amount: 5000,
        currency: 'usd',
      };
      
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValueOnce(mockPaymentIntent);
      
      const request = createMockPostRequest({ amount: 50 });
      const response = await createDepositIntent(request);
      
      expect(response.status).toBe(200);
      
      // Verify customer was created
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email: mockUser.email,
        name: mockUser.name,
        metadata: {
          userId: mockUser.id,
          familyId: mockFamilyId,
        }
      });
      
      // Verify wallet was updated with customer ID
      expect(prisma.familyWallet.update).toHaveBeenCalledWith({
        where: { id: mockWalletWithoutStripeCustomer.id },
        data: { stripeCustomerId: mockCustomer.id }
      });
    });
    
    test('creates payment intent with existing wallet and customer', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamily);
      
      const mockPaymentIntent = {
        id: 'pi_mock_123',
        client_secret: 'pi_mock_secret_123',
        amount: 5000,
        currency: 'usd',
      };
      
      (stripe.paymentIntents.create as jest.Mock).mockResolvedValueOnce(mockPaymentIntent);
      
      (prisma.payment.create as jest.Mock).mockResolvedValueOnce({
        id: 'payment-123',
        userId: mockUser.id,
        amount: 50,
        type: 'DEPOSIT',
        status: 'PENDING',
        stripePaymentId: mockPaymentIntent.id,
      });
      
      const request = createMockPostRequest({ 
        amount: 50,
        currency: 'usd',
        description: 'Test deposit'
      });
      const response = await createDepositIntent(request);
      
      expect(response.status).toBe(200);
      
      // Verify payment intent was created
      expect(stripe.paymentIntents.create).toHaveBeenCalledWith({
        amount: 5000, // 50 dollars in cents
        currency: 'usd',
        customer: mockFamily.wallet.stripeCustomerId,
        metadata: {
          familyId: mockFamilyId,
          userId: mockUser.id,
          walletId: mockWalletId,
        },
        description: 'Test deposit',
      });
      
      // Verify payment record was created
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUser.id,
          amount: 50,
          type: 'DEPOSIT',
          status: 'PENDING',
          stripePaymentId: mockPaymentIntent.id,
          description: 'Test deposit',
        }),
      });
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        clientSecret: mockPaymentIntent.client_secret,
        paymentIntentId: mockPaymentIntent.id,
      });
    });
  });
  
  describe('GET /api/payments/wallet', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockGetRequest();
      const response = await getWallet(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a family', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, role: 'CAREGIVER' },
      });
      
      const request = createMockGetRequest();
      const response = await getWallet(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Only family users can access wallet" });
    });
    
    test('returns 404 when family record is not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockGetRequest();
      const response = await getWallet(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Family record not found" });
    });
    
    test('returns existing wallet', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamily);
      
      const request = createMockGetRequest();
      const response = await getWallet(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        wallet: {
          id: mockWalletId,
          familyId: mockFamilyId,
          balance: 100.00,
        }
      });
    });
    
    test('creates and returns wallet if it does not exist', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamilyWithoutWallet);
      
      const newWallet = {
        id: 'new-wallet-123',
        familyId: mockFamilyId,
        balance: 0,
      };
      
      (prisma.familyWallet.create as jest.Mock).mockResolvedValueOnce(newWallet);
      
      const request = createMockGetRequest();
      const response = await getWallet(request);
      
      expect(response.status).toBe(200);
      
      // Verify wallet was created
      expect(prisma.familyWallet.create).toHaveBeenCalledWith({
        data: {
          familyId: mockFamilyId,
          balance: 0,
        }
      });
      
      // Verify response
      const data = await response.json();
      expect(data).toEqual({
        wallet: {
          id: newWallet.id,
          familyId: newWallet.familyId,
          balance: newWallet.balance,
        }
      });
    });
  });
});
