/**
 * Unit tests for Calendar Availability API
 * 
 * Tests the GET/POST /api/calendar/availability endpoints
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/calendar/availability/route';
import { AppointmentStatus, AppointmentType } from '@/lib/types/calendar';

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
      appointment: {
        findMany: jest.fn(),
      },
      availabilitySlot: {
        findMany: jest.fn(),
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest for GET
function createMockGetRequest(params = {}) {
  const url = new URL('https://example.com/api/calendar/availability');
  
  // Add query parameters
  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => url.searchParams.append(key, v as string));
    } else {
      url.searchParams.append(key, value as string);
    }
  });
  
  const request = {
    nextUrl: url,
    method: 'GET',
  } as unknown as NextRequest;
  
  return request;
}

// Helper to create a mock NextRequest for POST
function createMockJsonRequest(body = null, method = 'POST') {
  const url = new URL('https://example.com/api/calendar/availability');
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

describe('Calendar Availability API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    role: 'FAMILY'
  };
  
  const mockAppointment = {
    id: 'appt-123',
    type: AppointmentType.CARE_EVALUATION,
    status: AppointmentStatus.PENDING,
    title: 'Test Appointment',
    startTime: new Date('2025-10-15T10:00:00Z'),
    endTime: new Date('2025-10-15T11:00:00Z'),
    createdById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      role: 'FAMILY'
    },
    participants: []
  };
  
  const mockAvailabilitySlot = {
    id: 'avail-123',
    userId: 'user-123',
    startTime: new Date('2025-10-15T09:00:00Z'),
    endTime: new Date('2025-10-15T17:00:00Z'),
    isAvailable: true,
    availableFor: [AppointmentType.CARE_EVALUATION]
  };
  
  beforeEach(() => {
    // Setup default mocks
    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.availabilitySlot.findMany as jest.Mock).mockResolvedValue([]);
  });
  
  describe('GET /api/calendar/availability', () => {
    const validParams = {
      userId: 'user-123',
      startTime: '2025-10-15T10:00:00Z',
      endTime: '2025-10-15T11:00:00Z',
      appointmentType: AppointmentType.CARE_EVALUATION
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockGetRequest(validParams);
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('returns 400 when required parameters are missing', async () => {
      const request = createMockGetRequest({
        userId: 'user-123',
        // Missing startTime, endTime, appointmentType
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Missing required parameters');
    });
    
    test('returns isAvailable=false when conflicts exist', async () => {
      // Mock conflicts
      (prisma.appointment.findMany as jest.Mock).mockResolvedValueOnce([mockAppointment]);
      
      const request = createMockGetRequest(validParams);
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('isAvailable', false);
      expect(data.data).toHaveProperty('conflicts');
      expect(data.data.conflicts).toHaveLength(1);
      expect(data.data.conflicts[0]).toHaveProperty('id', 'appt-123');
    });
    
    test('returns isAvailable=true when no conflicts and within business hours', async () => {
      // Mock no conflicts
      (prisma.appointment.findMany as jest.Mock).mockResolvedValueOnce([]);
      
      const request = createMockGetRequest({
        ...validParams,
        // Use 10 AM - 11 AM (within business hours)
        startTime: '2025-10-15T10:00:00Z',
        endTime: '2025-10-15T11:00:00Z',
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('isAvailable', true);
      expect(data.data).toHaveProperty('conflicts');
      expect(data.data.conflicts).toHaveLength(0);
    });
    
    test('returns isAvailable=true when availability slot exists', async () => {
      // Mock availability slot
      (prisma.availabilitySlot.findMany as jest.Mock).mockResolvedValueOnce([mockAvailabilitySlot]);
      
      const request = createMockGetRequest(validParams);
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('isAvailable', true);
    });
  });
  
  describe('POST /api/calendar/availability', () => {
    const validRequestBody = {
      userId: 'user-123',
      startDate: '2025-10-15T00:00:00Z',
      endDate: '2025-10-16T23:59:59Z',
      appointmentType: AppointmentType.CARE_EVALUATION,
      duration: 60,
      excludeWeekends: false,
      businessHoursOnly: true
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockJsonRequest(validRequestBody);
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('returns available slots respecting business hours', async () => {
      const request = createMockJsonRequest(validRequestBody);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('availableSlots');
      expect(Array.isArray(data.data.availableSlots)).toBe(true);
      expect(data.data).toHaveProperty('slotsByDay');
      expect(typeof data.data.slotsByDay).toBe('object');
      
      // Verify prisma was called with correct parameters
      expect(prisma.availabilitySlot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
            isAvailable: true
          })
        })
      );
      
      expect(prisma.appointment.findMany).toHaveBeenCalled();
    });
    
    test('respects excludeWeekends parameter', async () => {
      // October 18-19, 2025 is a weekend (Sat-Sun)
      const weekendRequest = {
        ...validRequestBody,
        startDate: '2025-10-18T00:00:00Z', // Saturday
        endDate: '2025-10-19T23:59:59Z',   // Sunday
        excludeWeekends: true
      };
      
      const request = createMockJsonRequest(weekendRequest);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Should have no slots since we're excluding weekends
      expect(data.data.availableSlots).toHaveLength(0);
      expect(Object.keys(data.data.slotsByDay)).toHaveLength(0);
    });
    
    test('includes availability slots when they exist', async () => {
      // Mock availability slots
      (prisma.availabilitySlot.findMany as jest.Mock).mockResolvedValueOnce([
        {
          ...mockAvailabilitySlot,
          startTime: new Date('2025-10-15T09:00:00Z'),
          endTime: new Date('2025-10-15T17:00:00Z')
        }
      ]);
      
      const request = createMockJsonRequest(validRequestBody);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data.data.availableSlots.length).toBeGreaterThan(0);
      expect(Object.keys(data.data.slotsByDay)).toContain('2025-10-15');
    });
    
    test('filters out slots with conflicts', async () => {
      // Mock conflicts during the 10-11 AM slot
      (prisma.appointment.findMany as jest.Mock).mockResolvedValueOnce([
        {
          ...mockAppointment,
          startTime: new Date('2025-10-15T10:00:00Z'),
          endTime: new Date('2025-10-15T11:00:00Z')
        }
      ]);
      
      const request = createMockJsonRequest(validRequestBody);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      // Check that no slot starts at 10 AM
      const has10AMSlot = data.data.availableSlots.some(
        (slot: any) => slot.startTime.includes('T10:00:00')
      );
      
      expect(has10AMSlot).toBe(false);
    });
  });
});
