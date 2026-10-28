/**
 * Unit tests for Payroll Summary API
 *
 * Tests the endpoints:
 * - GET /api/payroll/summary (JSON)
 * - GET /api/payroll/summary.csv (CSV)
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getSummaryJson } from '@/app/api/payroll/summary/route';
import { GET as getSummaryCsv } from '@/app/api/payroll/summary.csv/route';

// Mocks
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      operator: {
        findUnique: jest.fn(),
      },
      payment: {
        findMany: jest.fn(),
      },
    }
  };
});

// Imports after mocks
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

function createGet(path: string) {
  const url = new URL(path);
  return { nextUrl: url, method: 'GET' } as unknown as NextRequest;
}

const mockOperatorUser = { id: 'user-operator-1', email: 'op@example.com' };
const mockOperator = { id: 'op-1', userId: mockOperatorUser.id };

// Mixed amount types to cover Decimal and number
const mkDec = (n: number) => ({ toNumber: () => n });

describe('Payroll summary APIs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('JSON: 401 when unauthenticated', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);
    const res = await getSummaryJson(createGet('https://example.com/api/payroll/summary'));
    expect(res.status).toBe(401);
  });

  test('JSON: 403 when not operator', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
    (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
    const res = await getSummaryJson(createGet('https://example.com/api/payroll/summary'));
    expect(res.status).toBe(403);
  });

  test('JSON: returns aggregated totals', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
    (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
    (prisma.payment.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'p1', status: 'PENDING', amount: mkDec(10), stripePaymentId: null, marketplaceHireId: 'h1', marketplaceHire: { caregiverId: 'c1', shift: { id: 's1' } } },
      { id: 'p2', status: 'PROCESSING', amount: 20, stripePaymentId: 'tr_2', marketplaceHireId: 'h2', marketplaceHire: { caregiverId: 'c2', shift: { id: 's2' } } },
      { id: 'p3', status: 'COMPLETED', amount: mkDec(30.5), stripePaymentId: 'tr_3', marketplaceHireId: 'h3', marketplaceHire: { caregiverId: 'c3', shift: { id: 's3' } } },
    ]);

    const res = await getSummaryJson(createGet('https://example.com/api/payroll/summary'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totals.pending.amount).toBe(10);
    expect(data.totals.processing.amount).toBe(20);
    expect(data.totals.completed.amount).toBe(30.5);
    expect(data.totals.failed.amount).toBe(0);
    expect(Array.isArray(data.payments)).toBe(true);
  });

  test('CSV: returns file with header and rows', async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
    (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
    (prisma.payment.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'p1', status: 'PENDING', amount: mkDec(10), stripePaymentId: null, marketplaceHireId: 'h1', marketplaceHire: { caregiverId: 'c1', shift: { id: 's1' } } },
      { id: 'p2', status: 'COMPLETED', amount: 25, stripePaymentId: 'tr_2', marketplaceHireId: 'h2', marketplaceHire: { caregiverId: 'c2', shift: { id: 's2' } } },
    ]);

    const res = await getSummaryCsv(createGet('https://example.com/api/payroll/summary.csv'));
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    expect(lines[0]).toBe('paymentId,status,amount,transferId,hireId,shiftId,caregiverId');
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('p1,PENDING');
    expect(lines[2]).toContain('p2,COMPLETED');
  });
});
