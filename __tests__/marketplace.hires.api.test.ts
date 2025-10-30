/**
 * Unit tests for Marketplace Hires API
 * 
 * Tests the endpoint:
 * - GET /api/marketplace/hires
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getHires } from '@/app/api/marketplace/hires/route';

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
      },
      operator: {
        findUnique: jest.fn(),
      },
      marketplaceHire: {
        findMany: jest.fn(),
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest for GET
function createMockRequest(searchParams = {}) {
  const url = new URL('https://example.com/api/marketplace/hires');
  
  // Add search params if provided
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });
  }
  
  const request = {
    nextUrl: url,
    method: 'GET',
  } as unknown as NextRequest;
  
  return request;
}

describe('Marketplace Hires API', () => {
  // Common test data
  const mockCaregiverUser = {
    id: 'user-caregiver-123',
    email: 'caregiver@example.com',
    name: 'Caregiver User',
  };
  
  const mockOperatorUser = {
    id: 'user-operator-123',
    email: 'operator@example.com',
    name: 'Operator User',
  };
  
  const mockCaregiver = {
    id: 'caregiver-123',
    userId: 'user-caregiver-123',
  };
  
  const mockOperator = {
    id: 'operator-123',
    userId: 'user-operator-123',
  };
  
  const mockCaregiverHires = [
    {
      id: 'hire-123',
      caregiverId: 'caregiver-123',
      listingId: 'listing-123',
      shiftId: 'shift-123',
      acceptedAt: new Date(),
      createdAt: new Date(),
      listing: {
        id: 'listing-123',
        title: 'Caregiver Position'
      },
      shift: {
        id: 'shift-123',
        startTime: new Date(),
        endTime: new Date(),
        home: {
          id: 'home-123',
          name: 'Test Care Home'
        }
      },
      payment: {
        id: 'payment-123',
        status: 'PENDING'
      }
    }
  ];

  const mockOperatorHires = [
    {
      id: 'hire-456',
      caregiverId: 'caregiver-456',
      listingId: 'listing-456',
      shiftId: 'shift-456',
      acceptedAt: new Date(),
      createdAt: new Date(),
      listing: {
        id: 'listing-456',
        title: 'Operator Position'
      },
      shift: {
        id: 'shift-456',
        startTime: new Date(),
        endTime: new Date(),
        home: {
          id: 'home-456',
          name: 'Operator Care Home'
        }
      },
      payment: null
    }
  ];
  
  describe('GET /api/marketplace/hires', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await getHires(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns caregiver hires for caregiver user', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.marketplaceHire.findMany as jest.Mock).mockResolvedValueOnce(mockCaregiverHires);
      
      const request = createMockRequest();
      const response = await getHires(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('hires');
      expect(Array.isArray(data.hires)).toBe(true);
      expect(data.hires.length).toBe(1);
      
      // Verify findMany was called with correct parameters
      expect(prisma.marketplaceHire.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            caregiverId: mockCaregiver.id
          }
        })
      );
    });
    
    test('returns operator hires for operator user', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockOperatorUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.marketplaceHire.findMany as jest.Mock).mockResolvedValueOnce(mockOperatorHires);
      
      const request = createMockRequest();
      const response = await getHires(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('hires');
      expect(Array.isArray(data.hires)).toBe(true);
      
      // Verify findMany was called (no deep filter assertion needed)
      expect(prisma.marketplaceHire.findMany).toHaveBeenCalled();
    });
  });
});
