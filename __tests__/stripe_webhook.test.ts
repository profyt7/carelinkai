/**
 * Tests for Stripe webhook handler
 * 
 * Tests the payment_intent.succeeded event handling and idempotency
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '@/app/api/webhooks/stripe/route';

// Mock Stripe
jest.mock('@/lib/stripe', () => {
  return {
    stripe: {
      webhooks: {
        constructEvent: jest.fn(),
      },
    },
  };
});

// Mock Prisma
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      payment: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      familyWallet: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      walletTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback({
        payment: {
          create: jest.fn().mockResolvedValue({ id: 'payment-123', amount: 25.00 }),
        },
        familyWallet: {
          findUnique: jest.fn(),
          findFirst: jest.fn(),
          create: jest.fn().mockResolvedValue({ id: 'wallet-123', familyId: 'family-123', balance: 0 }),
          update: jest.fn().mockResolvedValue({ id: 'wallet-123', familyId: 'family-123', balance: 25.00 }),
        },
        walletTransaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123', amount: 25.00 }),
        },
      })),
    }
  };
});

// Import mocks after they're defined
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest
function createMockRequest(eventData: any, signature = 'test_signature') {
  const rawBody = JSON.stringify(eventData);
  
  const request = {
    text: jest.fn().mockResolvedValue(rawBody),
    headers: {
      get: jest.fn((name) => name === 'stripe-signature' ? signature : null),
    },
  } as unknown as NextRequest;
  
  return request;
}

// Sample payment intent succeeded event
const mockPaymentIntentSucceededEvent = {
  id: 'evt_123',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_123',
      amount: 2500, // $25.00 in cents
      currency: 'usd',
      metadata: {
        familyId: 'family-123',
        userId: 'user-123',
        walletId: 'wallet-123',
      },
    },
  },
};

describe('Stripe Webhook Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for constructEvent
    (stripe.webhooks.constructEvent as jest.Mock).mockImplementation((body, sig, secret) => {
      return JSON.parse(body);
    });
    
    // Set environment variable for tests
    process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
  });
  
  afterEach(() => {
    // Clean up environment
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });
  
  describe('payment_intent.succeeded handling', () => {
    test('processes new payment and updates wallet', async () => {
      // Mock payment not found (not processed yet)
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      
      const request = createMockRequest(mockPaymentIntentSucceededEvent);
      const response = await POST(request);
      
      // Verify response
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(expect.objectContaining({
        received: true,
        success: true,
      }));
      
      // Verify stripe webhook verification was called
      expect(stripe.webhooks.constructEvent).toHaveBeenCalledWith(
        expect.any(String),
        'test_signature',
        'test_secret'
      );
      
      // Verify idempotency check
      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_123' },
      });
      
      // Verify transaction was called
      expect(prisma.$transaction).toHaveBeenCalled();
      
      // Get the transaction callback
      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const txClient = {
        payment: {
          create: jest.fn().mockResolvedValue({ id: 'payment-123', amount: 25.00 }),
        },
        familyWallet: {
          findUnique: jest.fn().mockResolvedValue({ id: 'wallet-123', familyId: 'family-123', balance: 0 }),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'wallet-123', familyId: 'family-123', balance: 0 }),
          update: jest.fn().mockResolvedValue({ id: 'wallet-123', familyId: 'family-123', balance: 25.00 }),
        },
        walletTransaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123', amount: 25.00 }),
        },
      };
      
      // Execute the transaction callback with our mock client
      await transactionCallback(txClient);
      
      // Verify wallet lookup by ID
      expect(txClient.familyWallet.findUnique).toHaveBeenCalledWith({
        where: { id: 'wallet-123' },
      });
      
      // Verify payment creation
      expect(txClient.payment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          amount: 25.00,
          type: 'DEPOSIT',
          status: 'COMPLETED',
          stripePaymentId: 'pi_123',
        }),
      });
      
      // Verify wallet update
      expect(txClient.familyWallet.update).toHaveBeenCalledWith({
        where: { id: 'wallet-123' },
        data: { balance: 25.00 },
      });
      
      // Verify transaction creation
      expect(txClient.walletTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          walletId: 'wallet-123',
          type: 'DEPOSIT',
          amount: 25.00,
        }),
      });
    });
    
    test('creates new wallet when none exists', async () => {
      // Mock payment not found (not processed yet)
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      
      // Create event without walletId
      const eventWithoutWallet = {
        ...mockPaymentIntentSucceededEvent,
        data: {
          object: {
            ...mockPaymentIntentSucceededEvent.data.object,
            metadata: {
              familyId: 'family-123',
              userId: 'user-123',
              // No walletId
            },
          },
        },
      };
      
      const request = createMockRequest(eventWithoutWallet);
      const response = await POST(request);
      
      // Verify response
      expect(response.status).toBe(200);
      
      // Get the transaction callback
      const transactionCallback = (prisma.$transaction as jest.Mock).mock.calls[0][0];
      const txClient = {
        payment: {
          create: jest.fn().mockResolvedValue({ id: 'payment-123', amount: 25.00 }),
        },
        familyWallet: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id: 'new-wallet-123', familyId: 'family-123', balance: 0 }),
          update: jest.fn().mockResolvedValue({ id: 'new-wallet-123', familyId: 'family-123', balance: 25.00 }),
        },
        walletTransaction: {
          create: jest.fn().mockResolvedValue({ id: 'tx-123', amount: 25.00 }),
        },
      };
      
      // Execute the transaction callback with our mock client
      await transactionCallback(txClient);
      
      // Verify wallet lookup by familyId after walletId lookup fails
      expect(txClient.familyWallet.findFirst).toHaveBeenCalledWith({
        where: { familyId: 'family-123' },
      });
      
      // Verify wallet creation
      expect(txClient.familyWallet.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          familyId: 'family-123',
          balance: 0,
        }),
      });
    });
    
    test('handles idempotency correctly', async () => {
      // Mock payment already exists
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue({
        id: 'payment-123',
        stripePaymentId: 'pi_123',
        amount: 25.00,
      });
      
      const request = createMockRequest(mockPaymentIntentSucceededEvent);
      const response = await POST(request);
      
      // Verify response
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(expect.objectContaining({
        received: true,
        message: "Payment already processed",
      }));
      
      // Verify idempotency check
      expect(prisma.payment.findFirst).toHaveBeenCalledWith({
        where: { stripePaymentId: 'pi_123' },
      });
      
      // Verify transaction was NOT called
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
    
    test('handles missing metadata gracefully', async () => {
      // Create event without required metadata
      const eventWithoutMetadata = {
        ...mockPaymentIntentSucceededEvent,
        data: {
          object: {
            ...mockPaymentIntentSucceededEvent.data.object,
            metadata: {
              // No familyId or userId
            },
          },
        },
      };
      
      const request = createMockRequest(eventWithoutMetadata);
      const response = await POST(request);
      
      // Verify response
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(expect.objectContaining({
        error: "Missing required metadata",
      }));
      
      // Verify transaction was NOT called
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
    
    test('bypasses signature verification in development mode', async () => {
      // Remove webhook secret to simulate dev mode
      delete process.env.STRIPE_WEBHOOK_SECRET;
      
      // Mock payment not found (not processed yet)
      (prisma.payment.findFirst as jest.Mock).mockResolvedValue(null);
      
      const request = createMockRequest(mockPaymentIntentSucceededEvent);
      const response = await POST(request);
      
      // Verify response
      expect(response.status).toBe(200);
      
      // Verify stripe webhook verification was NOT called
      expect(stripe.webhooks.constructEvent).not.toHaveBeenCalled();
      
      // Verify transaction was still called
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
  
  describe('other event types', () => {
    test('ignores non-payment_intent.succeeded events', async () => {
      const otherEvent = {
        id: 'evt_456',
        type: 'charge.succeeded',
        data: {
          object: {
            id: 'ch_123',
          },
        },
      };
      
      const request = createMockRequest(otherEvent);
      const response = await POST(request);
      
      // Verify response
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(expect.objectContaining({
        received: true,
        message: "Ignored event type",
      }));
      
      // Verify transaction was NOT called
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  /* -------------------------------------------------------------------
   * Transfer event reconciliation tests
   * ------------------------------------------------------------------*/
  describe('transfer.* handling', () => {
    test('updates payment status by stripePaymentId on transfer.paid', async () => {
      const event = {
        id: 'evt_tr_paid',
        type: 'transfer.paid',
        data: {
          object: {
            id: 'tr_123',
            status: 'paid',
            metadata: {},
          },
        },
      };

      const request = createMockRequest(event);

      // First call resolves 1 update (by transferId)
      (prisma.payment.updateMany as jest.Mock).mockResolvedValueOnce({ count: 1 });

      const res = await POST(request as unknown as NextRequest);

      expect(res.status).toBe(200);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { stripePaymentId: 'tr_123', type: 'CAREGIVER_PAYMENT' },
        data: { status: 'COMPLETED' },
      });
    });

    test('falls back to hireId when no record by transferId', async () => {
      const event = {
        id: 'evt_tr_failed',
        type: 'transfer.failed',
        data: {
          object: {
            id: 'tr_456',
            status: 'failed',
            metadata: { hireId: 'hire-1' },
          },
        },
      };

      const request = createMockRequest(event);

      // First updateMany returns 0 (no payment by transferId)
      (prisma.payment.updateMany as jest.Mock)
        .mockResolvedValueOnce({ count: 0 }) // by transferId
        .mockResolvedValueOnce({ count: 2 }); // by hireId

      const res = await POST(request as unknown as NextRequest);

      expect(res.status).toBe(200);
      expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(1, {
        where: { stripePaymentId: 'tr_456', type: 'CAREGIVER_PAYMENT' },
        data: { status: 'FAILED' },
      });
      expect(prisma.payment.updateMany).toHaveBeenNthCalledWith(2, {
        where: { marketplaceHireId: 'hire-1', type: 'CAREGIVER_PAYMENT' },
        data: { status: 'FAILED', stripePaymentId: 'tr_456' },
      });
    });
  });
});
