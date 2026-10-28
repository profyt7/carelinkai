/**
 * Unit tests for Shifts API
 * 
 * Tests the endpoints:
 * - GET /api/shifts/open
 * - GET /api/shifts/my
 * - POST /api/shifts
 * - POST /api/shifts/[id]/claim
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET as getOpenShifts } from '@/app/api/shifts/open/route';
import { GET as getMyShifts } from '@/app/api/shifts/my/route';
import { POST as createShift } from '@/app/api/shifts/route';
import { POST as claimShift } from '@/app/api/shifts/[id]/claim/route';
import { Prisma } from '@prisma/client';

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
      assistedLivingHome: {
        findUnique: jest.fn(),
      },
      caregiverShift: {
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      // new mocks for transaction & hire creation
      $transaction: jest.fn(),
      marketplaceHire: {
        create: jest.fn(),
      },
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest for GET
function createMockRequest(searchParams = {}, method = 'GET') {
  const url = new URL('https://example.com/api/shifts/open');
  
  // Add search params if provided
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });
  }
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue({}),
  } as unknown as NextRequest;
  
  return request;
}

// Helper to create a mock NextRequest for routes with params
function createMockRequestWithParams(params = {}, body = null, method = 'POST') {
  const url = new URL(`https://example.com/api/shifts/${params.id || 'shift-123'}/claim`);
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

describe('Shifts API', () => {
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
  
  const mockHome = {
    id: 'home-123',
    operatorId: 'operator-123',
    name: 'Test Care Home',
    address: {
      street: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
    }
  };
  
  const mockShift = {
    id: 'shift-123',
    homeId: 'home-123',
    caregiverId: null,
    startTime: new Date('2025-10-01T09:00:00Z'),
    endTime: new Date('2025-10-01T17:00:00Z'),
    hourlyRate: new Prisma.Decimal('25.50'),
    status: 'OPEN',
    notes: 'Test shift',
    createdAt: new Date(),
    updatedAt: new Date(),
    home: {
      name: 'Test Care Home',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
      }
    }
  };
  
  const mockAssignedShift = {
    ...mockShift,
    id: 'shift-456',
    caregiverId: 'caregiver-123',
    status: 'ASSIGNED',
  };
  
  describe('GET /api/shifts/open', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await getOpenShifts(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await getOpenShifts(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('returns paginated open shifts with formatted fields', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      (prisma.caregiverShift.findMany as jest.Mock).mockResolvedValueOnce([mockShift]);
      (prisma.caregiverShift.count as jest.Mock).mockResolvedValueOnce(1);
      
      const request = createMockRequest({ page: '1', limit: '10' });
      const response = await getOpenShifts(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('shifts');
      expect(data.shifts).toHaveLength(1);
      expect(data.shifts[0]).toEqual(expect.objectContaining({
        id: mockShift.id,
        homeId: mockShift.homeId,
        homeName: mockShift.home.name,
        address: '123 Main St, San Francisco, CA',
        hourlyRate: mockShift.hourlyRate.toString(),
        status: mockShift.status,
      }));
      
      // Verify dates are serialized as strings
      expect(typeof data.shifts[0].startTime).toBe('string');
      expect(typeof data.shifts[0].endTime).toBe('string');
      
      // Verify pagination
      expect(data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasMore: false,
      });
      
      // Verify query parameters
      expect(prisma.caregiverShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'OPEN',
            startTime: expect.any(Object),
          }),
          skip: 0,
          take: 10,
        })
      );
    });
  });
  
  describe('GET /api/shifts/my', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await getMyShifts(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await getMyShifts(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('returns shifts assigned to the caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      
      (prisma.caregiverShift.findMany as jest.Mock).mockResolvedValueOnce([mockAssignedShift]);
      (prisma.caregiverShift.count as jest.Mock).mockResolvedValueOnce(1);
      
      const request = createMockRequest();
      const response = await getMyShifts(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('shifts');
      expect(data.shifts).toHaveLength(1);
      expect(data.shifts[0]).toEqual(expect.objectContaining({
        id: mockAssignedShift.id,
        homeId: mockAssignedShift.homeId,
        homeName: mockAssignedShift.home.name,
        status: 'ASSIGNED',
      }));
      
      // Verify query was called with correct caregiver ID
      expect(prisma.caregiverShift.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            caregiverId: mockCaregiver.id,
          },
        })
      );
    });
  });
  
  describe('POST /api/shifts', () => {
    const validShiftData = {
      homeId: 'home-123',
      startTime: '2025-10-01T09:00:00Z',
      endTime: '2025-10-01T17:00:00Z',
      hourlyRate: 25.50,
      notes: 'Test shift',
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validShiftData);
      
      const response = await createShift(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not an operator', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockOperatorUser,
      });
      
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validShiftData);
      
      const response = await createShift(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as an operator" });
    });
    
    test('returns 400 when input validation fails', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockOperatorUser,
      });
      
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      
      const invalidData = {
        ...validShiftData,
        startTime: '2025-10-01T17:00:00Z', // Start after end
        endTime: '2025-10-01T09:00:00Z',
      };
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(invalidData);
      
      const response = await createShift(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid input');
    });
    
    test('returns 404 when home not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockOperatorUser,
      });
      
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validShiftData);
      
      const response = await createShift(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Home not found" });
    });
    
    test('returns 403 when home does not belong to operator', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockOperatorUser,
      });
      
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockHome,
        operatorId: 'different-operator-id',
      });
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validShiftData);
      
      const response = await createShift(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ 
        error: "You do not have permission to create shifts for this home" 
      });
    });
    
    test('successfully creates a shift', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockOperatorUser,
      });
      
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(mockHome);
      (prisma.caregiverShift.create as jest.Mock).mockResolvedValueOnce(mockShift);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validShiftData);
      
      const response = await createShift(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.shift).toEqual(expect.objectContaining({
        id: mockShift.id,
        homeId: mockShift.homeId,
        status: 'OPEN',
      }));
      
      // Verify create was called with correct data
      expect(prisma.caregiverShift.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          homeId: validShiftData.homeId,
          hourlyRate: expect.any(Object), // Prisma.Decimal
          status: 'OPEN',
        }),
      });
    });
  });
  
  describe('POST /api/shifts/[id]/claim', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'shift-123' });
      const response = await claimShift(request, { params: { id: 'shift-123' } });
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'shift-123' });
      const response = await claimShift(request, { params: { id: 'shift-123' } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('returns 404 when shift not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent-shift' });
      const response = await claimShift(request, { params: { id: 'non-existent-shift' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Shift not found" });
    });
    
    test('returns 409 when shift is not available', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockShift,
        status: 'ASSIGNED',
      });
      
      const request = createMockRequestWithParams({ id: 'shift-123' });
      const response = await claimShift(request, { params: { id: 'shift-123' } });
      
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "Shift is not available for claiming" });
    });
    
    test('returns 409 when shift is already assigned', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockShift,
        caregiverId: 'other-caregiver-id',
      });
      
      const request = createMockRequestWithParams({ id: 'shift-123' });
      const response = await claimShift(request, { params: { id: 'shift-123' } });
      
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "Shift is already assigned to another caregiver" });
    });
    
    test('successfully claims a shift', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockCaregiverUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce(mockShift);
      // Mock the transactional update + hire creation
      const updatedShift = {
        ...mockShift,
        caregiverId: mockCaregiver.id,
        status: 'ASSIGNED',
      };
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([
        updatedShift,
        { id: 'hire-123' },
      ]);
      
      const request = createMockRequestWithParams({ id: 'shift-123' });
      const response = await claimShift(request, { params: { id: 'shift-123' } });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.shift).toEqual(expect.objectContaining({
        id: mockShift.id,
        homeId: mockShift.homeId,
        status: 'ASSIGNED',
      }));
      expect(data.hireId).toBe('hire-123');
      
      // Verify transaction was executed
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
