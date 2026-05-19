/**
 * Unit tests for Background Check API
 *
 * Tests the endpoints:
 * - POST /api/caregiver/background-checks/start
 * - GET /api/caregiver/background-checks/status
 * - POST /api/webhooks/checkr
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { POST as startBackgroundCheck } from '@/app/api/caregiver/background-checks/start/route';
import { GET as getBackgroundCheckStatus } from '@/app/api/caregiver/background-checks/status/route';
import { POST as webhookCheckr } from '@/app/api/webhooks/checkr/route';

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  // Set up default null returns for prisma models used in webhook route
  (prisma.providerCredential.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.backgroundCheckInvitation.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.providerBackgroundCheckOrder.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.backgroundCheckOrder.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.backgroundCheckOrder.update as jest.Mock).mockResolvedValue({});
  (prisma.backgroundCheckOrder.create as jest.Mock).mockResolvedValue({ id: 'order-default' });
  (prisma.caregiver.update as jest.Mock).mockResolvedValue({});
  (prisma.notification.create as jest.Mock).mockResolvedValue({});
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

// Mock Prisma — includes all models touched by the routes under test
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      caregiver: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      backgroundCheckOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      providerCredential: {
        findUnique: jest.fn(),
      },
      backgroundCheckInvitation: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      providerBackgroundCheckOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    },
  };
});

// Mock Checkr API calls (external HTTP) — keep pure functions real
jest.mock('@/lib/checkr', () => ({
  ...jest.requireActual('@/lib/checkr'),
  createCandidate: jest.fn(),
  createReport: jest.fn(),
}));

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { createCandidate, createReport } from '@/lib/checkr';

// Helper to create a mock NextRequest for POST
function createMockRequest(body = {}, method = 'POST') {
  const url = new URL('https://example.com/api/caregiver/background-checks/start');

  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;

  return request;
}

// Helper to create a mock NextRequest for GET
function createMockGetRequest(method = 'GET') {
  const url = new URL('https://example.com/api/caregiver/background-checks/status');

  const request = {
    nextUrl: url,
    method,
  } as unknown as NextRequest;

  return request;
}

// Helper to create a mock NextRequest for webhook
function createMockWebhookRequest(body = {}) {
  const url = new URL('https://example.com/api/webhooks/checkr');

  const request = {
    nextUrl: url,
    method: 'POST',
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
    headers: { get: jest.fn().mockReturnValue('') },
  } as unknown as NextRequest;

  return request;
}

describe('Background Check API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'caregiver@example.com',
    name: 'Caregiver User',
  };

  const mockCaregiverId = 'caregiver-123';

  const mockCaregiver = {
    id: mockCaregiverId,
    userId: mockUser.id,
    checkrCandidateId: null,
    backgroundCheckStatus: 'NOT_STARTED',
    backgroundCheckProvider: null,
    backgroundCheckReportUrl: null,
    user: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
  };

  describe('POST /api/caregiver/background-checks/start', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockRequest();
      const response = await startBackgroundCheck(request);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });

      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockRequest();
      const response = await startBackgroundCheck(request);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Not registered as a caregiver" });
    });

    test('successfully initiates a background check with default provider', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (createCandidate as jest.Mock).mockResolvedValueOnce({ id: 'candidate-123' });
      (prisma.caregiver.update as jest.Mock).mockResolvedValueOnce({}); // checkrCandidateId update
      (createReport as jest.Mock).mockResolvedValueOnce({ id: 'report-123' });
      (prisma.backgroundCheckOrder.create as jest.Mock).mockResolvedValueOnce({ id: 'order-123' });
      (prisma.caregiver.update as jest.Mock).mockResolvedValueOnce({}); // status update

      const request = createMockRequest({});
      const response = await startBackgroundCheck(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('PENDING');
      expect(data.orderId).toBe('order-123');
      expect(data.reportId).toBe('report-123');
    });

    test('successfully initiates a background check (request body is ignored by route)', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (createCandidate as jest.Mock).mockResolvedValueOnce({ id: 'candidate-456' });
      (prisma.caregiver.update as jest.Mock).mockResolvedValueOnce({});
      (createReport as jest.Mock).mockResolvedValueOnce({ id: 'report-456' });
      (prisma.backgroundCheckOrder.create as jest.Mock).mockResolvedValueOnce({ id: 'order-456' });
      (prisma.caregiver.update as jest.Mock).mockResolvedValueOnce({});

      const request = createMockRequest({ provider: 'MANUAL' });
      const response = await startBackgroundCheck(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('PENDING');
      expect(data.orderId).toBe('order-456');
      expect(data.reportId).toBe('report-456');
    });
  });

  describe('GET /api/caregiver/background-checks/status', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockGetRequest();
      const response = await getBackgroundCheckStatus(request);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });

    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });

      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockGetRequest();
      const response = await getBackgroundCheckStatus(request);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });

    test('successfully returns background check status', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });

      const caregiverWithStatus = {
        ...mockCaregiver,
        backgroundCheckStatus: 'CLEAR',
        backgroundCheckProvider: 'CHECKR',
        backgroundCheckReportUrl: 'https://example.com/report',
      };

      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(caregiverWithStatus);

      const request = createMockGetRequest();
      const response = await getBackgroundCheckStatus(request);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('CLEAR');
      expect(data.provider).toBe('CHECKR');
      expect(data.reportUrl).toBe('https://example.com/report');
    });
  });

  describe('POST /api/webhooks/checkr', () => {
    // The webhook route returns 200 { received: true } for all non-error paths,
    // including unrecognized event types (Checkr best practice: always ACK).

    test('returns 200 for payload with no recognized event type', async () => {
      const request = createMockWebhookRequest({
        // No 'type' field — treated as unrecognized event
        status: 'CLEAR',
      });

      const response = await webhookCheckr(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
    });

    test('returns 200 for payload with non-report event type', async () => {
      const request = createMockWebhookRequest({
        type: 'candidate.created',
        data: { object: { id: 'cand-123' } },
      });

      const response = await webhookCheckr(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
    });

    test('returns 200 when report id is not found in any order table', async () => {
      // All findUnique mocks return null (set in beforeEach)
      // Fallback candidateId lookup also returns null
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockWebhookRequest({
        type: 'report.completed',
        data: { object: { id: 'unknown-report', status: 'clear', candidate_id: 'unknown-cand' } },
      });

      const response = await webhookCheckr(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });
    });

    test('successfully updates background check status', async () => {
      const reportId = 'report-checkr-123';
      (prisma.backgroundCheckOrder.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'order-123',
        caregiverId: mockCaregiverId,
      });
      // caregiver.findUnique for notification (status CLEAR triggers notification)
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce({ userId: mockUser.id });

      const webhookData = {
        type: 'report.completed',
        data: {
          object: {
            id: reportId,
            status: 'clear',
            candidate_id: 'cand-123',
            report_url: 'https://example.com/report',
          },
        },
      };

      const request = createMockWebhookRequest(webhookData);
      const response = await webhookCheckr(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });

      expect(prisma.caregiver.update).toHaveBeenCalledWith({
        where: { id: mockCaregiverId },
        data: {
          backgroundCheckStatus: 'CLEAR',
          backgroundCheckReportUrl: 'https://example.com/report',
        },
      });
    });

    test('successfully updates status without reportUrl', async () => {
      const reportId = 'report-checkr-456';
      (prisma.backgroundCheckOrder.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'order-456',
        caregiverId: mockCaregiverId,
      });
      // status 'pending' → PENDING — no notification created, no caregiver.findUnique needed

      const webhookData = {
        type: 'report.completed',
        data: {
          object: {
            id: reportId,
            status: 'pending',
            candidate_id: 'cand-123',
          },
        },
      };

      const request = createMockWebhookRequest(webhookData);
      const response = await webhookCheckr(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ received: true });

      expect(prisma.caregiver.update).toHaveBeenCalledWith({
        where: { id: mockCaregiverId },
        data: {
          backgroundCheckStatus: 'PENDING',
          backgroundCheckReportUrl: undefined,
        },
      });
    });
  });
});
