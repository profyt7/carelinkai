/**
 * Unit tests for Emergency Preferences API
 * 
 * Tests the GET and PUT handlers for /api/family/emergency
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
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
      emergencyPreference: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      familyMember: {
        findFirst: jest.fn(),
      },
      resident: {
        findFirst: jest.fn(),
      },
    }
  };
});

// Mock family service
jest.mock('@/lib/services/family', () => ({
  checkFamilyMembership: jest.fn().mockResolvedValue(true),
}));

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { checkFamilyMembership } from '@/lib/services/family';

// Helper to create a mock NextRequest
function createMockRequest(params = {}, method = 'GET', body = null) {
  const url = new URL('https://example.com/api/family/emergency');
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

describe('Emergency Preferences API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  };
  
  const mockFamilyId = 'family-123';
  
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
    // Setup default mocks
    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({
      familyId: mockFamilyId,
    });
  });
  
  describe('GET handler', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('returns 404 when no family is found for user', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'No family found for user' });
    });
    
    test('returns 403 when user is not a member of the family', async () => {
      (checkFamilyMembership as jest.Mock).mockResolvedValueOnce(false);
      
      const request = createMockRequest({ familyId: 'wrong-family' });
      const response = await GET(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Not a member of this family' });
    });
    
    test('returns default values when no preference exists', async () => {
      (prisma.emergencyPreference.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({ familyId: mockFamilyId });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        preference: {
          escalationChain: [],
          notifyMethods: ['EMAIL'],
          careInstructions: '',
        }
      });
    });
    
    test('returns existing preference when found', async () => {
      (prisma.emergencyPreference.findUnique as jest.Mock).mockResolvedValueOnce(mockPreference);
      
      const request = createMockRequest({ familyId: mockFamilyId });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        preference: expect.objectContaining({
          id: mockPreference.id,
          familyId: mockPreference.familyId,
          residentId: mockPreference.residentId,
          escalationChain: mockPreference.escalationChain,
          notifyMethods: mockPreference.notifyMethods,
          careInstructions: mockPreference.careInstructions,
          // Dates returned by the API are serialized to ISO strings
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          lastConfirmedAt: expect.any(String),
        }),
      });
    });
  });
  
  describe('PUT handler', () => {
    const mockRequestBody = {
      escalationChain: [{ name: 'New Contact', phone: '+9876543210' }],
      notifyMethods: ['SMS', 'CALL'],
      careInstructions: 'Updated instructions',
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'PUT', mockRequestBody);
      const response = await PUT(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('returns 400 when request body is invalid', async () => {
      const invalidBody = {
        escalationChain: 'not-an-array', // Should be an array
        notifyMethods: ['SMS', 'CALL'],
      };
      
      const request = createMockRequest({}, 'PUT', invalidBody);
      const response = await PUT(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid request parameters');
    });
    
    test('returns 404 when no family is found for user', async () => {
      (prisma.familyMember.findFirst as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'PUT', mockRequestBody);
      const response = await PUT(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'No family found for user' });
    });
    
    test('returns 403 when user is not a member of the family', async () => {
      (checkFamilyMembership as jest.Mock).mockResolvedValueOnce(false);
      
      const request = createMockRequest({ familyId: 'wrong-family' }, 'PUT', mockRequestBody);
      const response = await PUT(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: 'Not a member of this family' });
    });
    
    test('returns 404 when resident is not found or not part of family', async () => {
      const bodyWithResident = {
        ...mockRequestBody,
        residentId: 'resident-123',
      };
      
      (prisma.resident.findFirst as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'PUT', bodyWithResident);
      const response = await PUT(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Resident not found or not part of this family' });
    });
    
    test('successfully creates/updates preference and returns it', async () => {
      const updatedPreference = {
        ...mockPreference,
        escalationChain: mockRequestBody.escalationChain,
        notifyMethods: mockRequestBody.notifyMethods,
        careInstructions: mockRequestBody.careInstructions,
      };
      
      (prisma.emergencyPreference.upsert as jest.Mock).mockResolvedValueOnce(updatedPreference);
      
      const request = createMockRequest({ familyId: mockFamilyId }, 'PUT', mockRequestBody);
      const response = await PUT(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toEqual({
        preference: expect.objectContaining({
          id: updatedPreference.id,
          familyId: updatedPreference.familyId,
          residentId: updatedPreference.residentId,
          escalationChain: updatedPreference.escalationChain,
          notifyMethods: updatedPreference.notifyMethods,
          careInstructions: updatedPreference.careInstructions,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          lastConfirmedAt: expect.any(String),
        }),
      });
      
      // Verify upsert was called with correct parameters
      expect(prisma.emergencyPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            familyId_residentId: {
              familyId: mockFamilyId,
              residentId: null,
            }
          },
          update: expect.objectContaining({
            escalationChain: mockRequestBody.escalationChain,
            notifyMethods: mockRequestBody.notifyMethods,
            careInstructions: mockRequestBody.careInstructions,
          }),
          create: expect.objectContaining({
            familyId: mockFamilyId,
            residentId: null,
            escalationChain: mockRequestBody.escalationChain,
            notifyMethods: mockRequestBody.notifyMethods,
            careInstructions: mockRequestBody.careInstructions,
          })
        })
      );
    });
  });
});
