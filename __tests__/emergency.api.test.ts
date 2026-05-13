/**
 * Unit tests for Emergency Preferences API
 *
 * Tests the GET and PUT handlers for /api/family/emergency
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, PUT } from '@/app/api/family/emergency/route';

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

// Mock auth-utils — the route uses requireAuth(), not getServerSession() directly
jest.mock('@/lib/auth-utils', () => ({
  requireAuth: jest.fn(),
  UnauthenticatedError: class UnauthenticatedError extends Error {
    constructor(message = 'Not authenticated') {
      super(message);
      this.name = 'UnauthenticatedError';
    }
  },
}));

// Mock audit log so it doesn't call prisma
jest.mock('@/lib/audit', () => ({
  createAuditLogFromRequest: jest.fn().mockResolvedValue(undefined),
}));

// Mock Prisma
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      familyMember: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      family: {
        findUnique: jest.fn(),
      },
      emergencyPreference: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      activityFeedItem: {
        create: jest.fn().mockResolvedValue({}),
      },
    },
  };
});

import { requireAuth } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest
function createMockRequest(params = {}, method = 'GET', body: object | null = null) {
  const url = new URL('https://example.com/api/family/emergency');

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  const request = {
    url: url.toString(),
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;

  return request;
}

describe('Emergency Preferences API', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'FAMILY' as const,
  };

  const mockFamilyId = 'claaaaaaaaaaaaaaaaaaaaaaaaa'; // valid cuid

  const mockPreference = {
    id: 'pref-123',
    familyId: mockFamilyId,
    residentId: null,
    escalationChain: [{ name: 'Emergency Contact', phone: '+1234567890' }],
    notifyMethods: ['SMS', 'EMAIL'],
    careInstructions: 'Test instructions',
    lastConfirmedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    (requireAuth as jest.Mock).mockResolvedValue(mockUser);
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ familyId: mockFamilyId });
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: mockFamilyId, userId: 'other-user' });
    (prisma.familyMember.create as jest.Mock).mockResolvedValue({ familyId: mockFamilyId });
  });

  describe('GET handler', () => {
    test('returns 401 when user is not authenticated', async () => {
      const { UnauthenticatedError } = jest.requireMock('@/lib/auth-utils') as any;
      (requireAuth as jest.Mock).mockRejectedValueOnce(new UnauthenticatedError());

      const request = createMockRequest({ familyId: mockFamilyId });
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    test('returns 400 when familyId is missing', async () => {
      const request = createMockRequest();
      const response = await GET(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'familyId required' });
    });

    test('returns 404 when family does not exist', async () => {
      // No existing FamilyMember → triggers family lookup → family not found
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockRequest({ familyId: mockFamilyId });
      const response = await GET(request);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Family not found' });
    });

    test('returns preferences: null when no preference exists', async () => {
      (prisma.emergencyPreference.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockRequest({ familyId: mockFamilyId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('preferences', null);
    });

    test('returns existing preference when found', async () => {
      (prisma.emergencyPreference.findFirst as jest.Mock).mockResolvedValueOnce(mockPreference);

      const request = createMockRequest({ familyId: mockFamilyId });
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('preferences');
      expect(data.preferences).toMatchObject({
        id: mockPreference.id,
        familyId: mockPreference.familyId,
        escalationChain: mockPreference.escalationChain,
        notifyMethods: mockPreference.notifyMethods,
        careInstructions: mockPreference.careInstructions,
      });
    });
  });

  describe('PUT handler', () => {
    const validBody = {
      familyId: mockFamilyId,
      escalationChain: [{ name: 'New Contact', phone: '+9876543210' }],
      notifyMethods: ['SMS', 'CALL'],
      careInstructions: 'Updated instructions',
    };

    test('returns 401 when user is not authenticated', async () => {
      const { UnauthenticatedError } = jest.requireMock('@/lib/auth-utils') as any;
      (requireAuth as jest.Mock).mockRejectedValueOnce(new UnauthenticatedError());

      const request = createMockRequest({}, 'PUT', validBody);
      const response = await PUT(request);

      expect(response.status).toBe(401);
    });

    test('returns 400 when request body is invalid', async () => {
      const invalidBody = {
        familyId: mockFamilyId,
        escalationChain: 'not-an-array', // must be array
        notifyMethods: ['SMS'],
      };

      const request = createMockRequest({}, 'PUT', invalidBody);
      const response = await PUT(request);

      expect(response.status).toBe(400);
    });

    test('returns 403 when user is not a member of the family', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValueOnce(null);

      const request = createMockRequest({}, 'PUT', validBody);
      const response = await PUT(request);

      expect(response.status).toBe(403);
    });

    test('creates preference when none exists and returns it', async () => {
      // First findFirst (member check) → found; second findFirst (existing pref) → null → create
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValueOnce({ familyId: mockFamilyId });
      (prisma.emergencyPreference.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.emergencyPreference.create as jest.Mock).mockResolvedValueOnce(mockPreference);

      const request = createMockRequest({}, 'PUT', validBody);
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('preferences');
      expect(data.preferences).toMatchObject({ id: mockPreference.id });
      expect(prisma.emergencyPreference.create).toHaveBeenCalled();
    });

    test('updates existing preference and returns it', async () => {
      const updatedPreference = { ...mockPreference, careInstructions: validBody.careInstructions };

      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValueOnce({ familyId: mockFamilyId });
      (prisma.emergencyPreference.findFirst as jest.Mock).mockResolvedValueOnce(mockPreference);
      (prisma.emergencyPreference.update as jest.Mock).mockResolvedValueOnce(updatedPreference);

      const request = createMockRequest({}, 'PUT', validBody);
      const response = await PUT(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('preferences');
      expect(data.preferences).toMatchObject({ id: mockPreference.id });
      expect(prisma.emergencyPreference.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockPreference.id },
          data: expect.objectContaining({
            escalationChain: validBody.escalationChain,
            notifyMethods: validBody.notifyMethods,
            careInstructions: validBody.careInstructions,
          }),
        })
      );
    });
  });
});
