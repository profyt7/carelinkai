/**
 * Unit tests for Timesheet Payment API
 *
 * Tests the endpoint:
 * - POST /api/timesheets/[id]/pay
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { POST as payTimesheet } from '@/app/api/timesheets/[id]/pay/route';

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
  jest.clearAllMocks();
});

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
      operator: {
        findUnique: jest.fn(),
      },
      timesheet: {
        findUnique: jest.fn(),
      },
      marketplaceHire: {
        findUnique: jest.fn(),
      },
      payment: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    }
  };
});

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    accounts: {
      retrieve: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
  },
}));

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

// Helper to create mock request
function createRequest(path = 'https://example.com/api/timesheets/ts-1/pay') {
  const url = new URL(path);
  return { nextUrl: url, method: 'POST' } as unknown as NextRequest;
}

// Common test data
const mockOperatorUser = { id: 'user-operator-1', email: 'op@example.com', name: 'OP', role: 'OPERATOR' };
const mockCaregiverUser = { id: 'user-caregiver-1', email: 'cg@example.com', name: 'CG', role: 'CAREGIVER' };
const mockOperator = { id: 'operator-1', userId: mockOperatorUser.id };
const mockCaregiver = { 
  id: 'caregiver-1', 
  userId: mockCaregiverUser.id,
  user: {
    id: mockCaregiverUser.id,
    preferences: {
      stripeConnectAccountId: 'acct_caregiver123'
    }
  }
};
const mockHome = { id: 'home-1', name: 'Home A', operatorId: mockOperator.id };
const mockShift = {
  id: 'shift-1',
  homeId: mockHome.id,
  caregiverId: mockCaregiver.id,
  hourlyRate: 25.00,
  home: {
    operatorId: mockOperator.id
  }
};
const mockTimesheet = {
  id: 'ts-1',
  shiftId: mockShift.id,
  caregiverId: mockCaregiver.id,
  startTime: new Date('2025-10-01T09:00:00Z'),
  endTime: new Date('2025-10-01T17:00:00Z'),
  breakMinutes: 30,
  status: 'APPROVED',
  shift: mockShift,
  caregiver: mockCaregiver
};
const mockHire = {
  id: 'hire-1',
  shiftId: mockShift.id,
  caregiverId: mockCaregiver.id
};
const mockPayment = {
  id: 'payment-1',
  marketplaceHireId: mockHire.id,
  amount: 187.50, // 7.5 hours at $25/hr
  status: 'PENDING',
  toNumber: () => 187.50
};
const mockUpdatedPayment = {
  ...mockPayment,
  status: 'PROCESSING',
  stripePaymentId: 'tr_123456'
};
const mockTransfer = {
  id: 'tr_123456',
  amount: 18750, // in cents
  status: 'pending'
};

describe('Timesheet Payment API', () => {
  describe('POST /api/timesheets/[id]/pay', () => {
    test('401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });

    test('403 when not operator', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toEqual({ error: "User is not registered as an operator" });
    });

    test('404 when timesheet not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toEqual({ error: "Timesheet not found" });
    });

    test('403 when timesheet home not owned by operator', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockTimesheet,
        shift: {
          ...mockShift,
          home: {
            operatorId: 'different-operator'
          }
        }
      });
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data).toEqual({ error: "You don't have permission to pay this timesheet" });
    });

    test('409 when timesheet not APPROVED', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockTimesheet,
        status: 'SUBMITTED'
      });
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toEqual({ 
        error: "Only timesheets with APPROVED status can be paid",
        currentStatus: "SUBMITTED"
      });
    });

    test('409 when no marketplace hire found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(mockTimesheet);
      (prisma.marketplaceHire.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toEqual({ 
        error: "No marketplace hire associated with this shift. Payment cannot be processed." 
      });
    });

    test('400 when caregiver has no Connect account', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockTimesheet,
        caregiver: {
          ...mockCaregiver,
          user: {
            ...mockCaregiver.user,
            preferences: {} // No stripeConnectAccountId
          }
        }
      });
      (prisma.marketplaceHire.findUnique as jest.Mock).mockResolvedValueOnce(mockHire);
      (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(mockPayment);
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Caregiver does not have a Stripe Connect account set up" });
    });

    test('400 when payouts not enabled', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(mockTimesheet);
      (prisma.marketplaceHire.findUnique as jest.Mock).mockResolvedValueOnce(mockHire);
      (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(mockPayment);
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({
        id: 'acct_caregiver123',
        payouts_enabled: false
      });
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toEqual({ error: "Payouts are not enabled for the caregiver's account" });
    });

    test('success: uses existing payment, creates transfer, updates payment', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(mockTimesheet);
      (prisma.marketplaceHire.findUnique as jest.Mock).mockResolvedValueOnce(mockHire);
      (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(mockPayment);
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({
        id: 'acct_caregiver123',
        payouts_enabled: true
      });
      (stripe.transfers.create as jest.Mock).mockResolvedValueOnce(mockTransfer);
      (prisma.payment.update as jest.Mock).mockResolvedValueOnce(mockUpdatedPayment);
      
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual({
        success: true,
        transferId: mockTransfer.id,
        paymentId: mockUpdatedPayment.id
      });
      
      // Verify Stripe transfer was created with correct parameters
      expect(stripe.transfers.create).toHaveBeenCalledWith({
        amount: 18750, // $187.50 converted to cents
        currency: 'usd',
        destination: 'acct_caregiver123',
        metadata: expect.objectContaining({
          timesheetId: mockTimesheet.id,
          shiftId: mockTimesheet.shiftId,
          hireId: mockHire.id,
          operatorId: mockOperator.id,
          caregiverId: mockTimesheet.caregiverId
        })
      });
      
      // Verify payment was updated
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: mockPayment.id },
        data: {
          status: "PROCESSING",
          stripePaymentId: mockTransfer.id
        }
      });
    });

    test('success: creates new payment if none exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(mockTimesheet);
      (prisma.marketplaceHire.findUnique as jest.Mock).mockResolvedValueOnce(mockHire);
      (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce(null); // No existing payment
      (prisma.payment.create as jest.Mock).mockResolvedValueOnce(mockPayment);
      (stripe.accounts.retrieve as jest.Mock).mockResolvedValueOnce({
        id: 'acct_caregiver123',
        payouts_enabled: true
      });
      (stripe.transfers.create as jest.Mock).mockResolvedValueOnce(mockTransfer);
      (prisma.payment.update as jest.Mock).mockResolvedValueOnce(mockUpdatedPayment);
      
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(200);
      
      // Verify payment was created
      expect(prisma.payment.create).toHaveBeenCalled();
    });

    test('409 when payment already completed', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(mockTimesheet);
      (prisma.marketplaceHire.findUnique as jest.Mock).mockResolvedValueOnce(mockHire);
      (prisma.payment.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockPayment,
        status: 'COMPLETED',
        stripePaymentId: 'tr_previous'
      });
      
      const req = createRequest();
      const res = await payTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data).toEqual({
        error: "This timesheet has already been paid",
        paymentId: mockPayment.id,
        stripePaymentId: 'tr_previous'
      });
    });
  });
});
