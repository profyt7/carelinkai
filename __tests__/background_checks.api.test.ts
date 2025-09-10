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
      caregiver: {
        findUnique: jest.fn(),
        update: jest.fn(),
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

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
    backgroundCheckStatus: 'NOT_STARTED',
    backgroundCheckProvider: null,
    backgroundCheckReportUrl: null,
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
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('successfully initiates a background check with default provider', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      const updatedCaregiver = {
        ...mockCaregiver,
        backgroundCheckStatus: 'PENDING',
        backgroundCheckProvider: 'CHECKR',
      };
      
      (prisma.caregiver.update as jest.Mock).mockResolvedValueOnce(updatedCaregiver);
      
      const request = createMockRequest({});
      const response = await startBackgroundCheck(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('PENDING');
      expect(data.provider).toBe('CHECKR');
      
      // Verify update was called with correct data
      expect(prisma.caregiver.update).toHaveBeenCalledWith({
        where: { id: mockCaregiverId },
        data: {
          backgroundCheckStatus: 'PENDING',
          backgroundCheckProvider: 'CHECKR',
          backgroundCheckReportUrl: null,
        },
        select: expect.any(Object),
      });
    });
    
    test('successfully initiates a background check with custom provider', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      const updatedCaregiver = {
        ...mockCaregiver,
        backgroundCheckStatus: 'PENDING',
        backgroundCheckProvider: 'CUSTOM_PROVIDER',
      };
      
      (prisma.caregiver.update as jest.Mock).mockResolvedValueOnce(updatedCaregiver);
      
      const request = createMockRequest({ provider: 'CUSTOM_PROVIDER' });
      const response = await startBackgroundCheck(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.status).toBe('PENDING');
      expect(data.provider).toBe('CUSTOM_PROVIDER');
      
      // Verify update was called with correct data
      expect(prisma.caregiver.update).toHaveBeenCalledWith({
        where: { id: mockCaregiverId },
        data: {
          backgroundCheckStatus: 'PENDING',
          backgroundCheckProvider: 'CUSTOM_PROVIDER',
          backgroundCheckReportUrl: null,
        },
        select: expect.any(Object),
      });
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
    test('returns 400 when payload is invalid', async () => {
      const request = createMockWebhookRequest({
        // Missing caregiverId
        status: 'CLEAR',
      });
      
      const response = await webhookCheckr(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid webhook payload');
    });
    
    test('returns 400 when status is invalid', async () => {
      const request = createMockWebhookRequest({
        caregiverId: mockCaregiverId,
        status: 'INVALID_STATUS', // Invalid status
      });
      
      const response = await webhookCheckr(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid webhook payload');
    });
    
    test('returns 404 when caregiver not found', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockWebhookRequest({
        caregiverId: 'non-existent',
        status: 'CLEAR',
      });
      
      const response = await webhookCheckr(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Caregiver not found" });
    });
    
    test('successfully updates background check status', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      const webhookData = {
        caregiverId: mockCaregiverId,
        status: 'CLEAR',
        reportUrl: 'https://example.com/report',
      };
      
      const request = createMockWebhookRequest(webhookData);
      const response = await webhookCheckr(request);
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      
      // Verify update was called with correct data
      expect(prisma.caregiver.update).toHaveBeenCalledWith({
        where: { id: mockCaregiverId },
        data: {
          backgroundCheckStatus: 'CLEAR',
          backgroundCheckReportUrl: 'https://example.com/report',
        }
      });
    });
    
    test('successfully updates status without reportUrl', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      const webhookData = {
        caregiverId: mockCaregiverId,
        status: 'PENDING',
      };
      
      const request = createMockWebhookRequest(webhookData);
      const response = await webhookCheckr(request);
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      
      // Verify update was called with correct data
      expect(prisma.caregiver.update).toHaveBeenCalledWith({
        where: { id: mockCaregiverId },
        data: {
          backgroundCheckStatus: 'PENDING',
          backgroundCheckReportUrl: undefined,
        }
      });
    });
  });
});
