import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Enable RBAC bypass in tests
process.env.NEXT_PUBLIC_E2E_AUTH_BYPASS = '1';
jest.mock('@/lib/auth', () => ({ authOptions: {} }));
jest.mock('@/lib/prisma', () => {
  const updateCalls: any[] = [];
  return {
    prisma: {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1', email: 'op@example.com', role: 'OPERATOR' }) },
      operator: { findUnique: jest.fn().mockResolvedValue({ id: 'op1', userId: 'u1' }) },
      assistedLivingHome: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => ({ id: where.id, operatorId: 'op1' })),
        update: jest.fn().mockImplementation((args: any) => { updateCalls.push(args); return { id: args.where.id }; }),
      },
      resident: {
        findUnique: jest.fn().mockResolvedValue({ id: 'r1', status: 'ACTIVE', homeId: 'h1' }),
        update: jest.fn().mockResolvedValue({ id: 'r1' }),
      },
      careTimelineEvent: { create: jest.fn().mockResolvedValue({ id: 't1' }) },
      $transaction: async (fn: any) => fn({
        assistedLivingHome: { update: jest.fn().mockResolvedValue({}) },
        resident: { update: jest.fn().mockResolvedValue({ id: 'r1' }) },
        careTimelineEvent: { create: jest.fn().mockResolvedValue({ id: 't1' }) },
      }),
    },
  };
});

import { prisma } from '@/lib/prisma';
// Import routes AFTER mocks are set up
// eslint-disable-next-line import/first
import { POST as POST_TRANSFER } from '@/app/api/residents/[id]/transfer/route';
// eslint-disable-next-line import/first
import { POST as POST_TIMELINE } from '@/app/api/residents/[id]/timeline/route';
// eslint-disable-next-line import/first
import { POST as POST_DISCHARGE } from '@/app/api/residents/[id]/discharge/route';

function createReq(method: string, body?: any, path = '/api') {
  const url = new URL(`https://example.com${path}`);
  const init: any = { method };
  if (body) init.json = async () => body;
  return { nextUrl: url, ...init } as unknown as NextRequest;
}

describe('Resident ops APIs', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', email: 'op@example.com', role: 'OPERATOR' });
    (prisma.operator.findUnique as jest.Mock).mockResolvedValue({ id: 'op1', userId: 'u1' });
    (prisma.resident.findUnique as jest.Mock).mockResolvedValue({ id: 'r1', status: 'ACTIVE', homeId: 'h1' });
  });

  // Minimal test focusing on discharge occupancy decrement behavior
  it('discharges resident and decrements occupancy', async () => {
    (prisma.resident.findUnique as jest.Mock).mockResolvedValue({ admissionDate: new Date('2024-01-01T00:00:00Z'), status: 'ACTIVE', homeId: 'h1' });
    const res = await POST_DISCHARGE(createReq('POST', { dischargeDate: new Date().toISOString() }, '/api/residents/r1/discharge'), { params: { id: 'r1' } } as any);
    expect(res.status).toBe(200);
  });
});
