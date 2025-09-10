/**
 * Unit tests for Calendar Appointments API
 * 
 * Tests the GET/POST/PUT/DELETE /api/calendar/appointments endpoints
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST, PUT, DELETE } from '@/app/api/calendar/appointments/route';
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
      user: {
        findUnique: jest.fn(),
      },
      appointment: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      appointmentParticipant: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest for GET
function createMockGetRequest(params = {}) {
  const url = new URL('https://example.com/api/calendar/appointments');
  
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

// Helper to create a mock NextRequest for POST/PUT
function createMockJsonRequest(body = null, method = 'POST') {
  const url = new URL('https://example.com/api/calendar/appointments');
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

// Helper to create a mock NextRequest for DELETE
function createMockDeleteRequest(id: string, body = null) {
  const url = new URL(`https://example.com/api/calendar/appointments?id=${id}`);
  
  const request = {
    nextUrl: url,
    method: 'DELETE',
    json: jest.fn().mockResolvedValue(body),
    body: body ? JSON.stringify(body) : null,
  } as unknown as NextRequest;
  
  return request;
}

describe('Calendar Appointments API', () => {
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
    description: 'Test description',
    startTime: new Date('2025-10-15T10:00:00Z'),
    endTime: new Date('2025-10-15T11:00:00Z'),
    location: { address: '123 Test St', room: '101' },
    homeId: 'home-123',
    residentId: 'resident-123',
    createdById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    recurrence: null,
    reminders: null,
    notes: 'Test notes',
    customFields: null,
    createdBy: {
      id: 'user-123',
      firstName: 'Test',
      lastName: 'User',
      role: 'FAMILY'
    },
    participants: [
      {
        id: 'part-123',
        userId: 'user-456',
        appointmentId: 'appt-123',
        name: 'Participant Name',
        role: 'CAREGIVER',
        status: 'PENDING',
        notes: null,
        user: {
          id: 'user-456',
          firstName: 'Participant',
          lastName: 'Name',
          role: 'CAREGIVER'
        }
      }
    ]
  };
  
  beforeEach(() => {
    // Setup default mocks
    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    
    (prisma.appointment.findUnique as jest.Mock).mockResolvedValue(mockAppointment);
    (prisma.appointment.findMany as jest.Mock).mockResolvedValue([mockAppointment]);
    (prisma.appointment.create as jest.Mock).mockResolvedValue({
      ...mockAppointment,
      participants: []
    });
  });
  
  describe('GET /api/calendar/appointments', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockGetRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('fetches a single appointment by ID', async () => {
      const request = createMockGetRequest({ id: 'appt-123' });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id', 'appt-123');
      expect(data.data).toHaveProperty('title', 'Test Appointment');
      expect(data.data).toHaveProperty('startTime');
      expect(data.data).toHaveProperty('endTime');
      expect(data.data).toHaveProperty('createdBy');
      expect(data.data.createdBy).toHaveProperty('id', 'user-123');
      expect(data.data).toHaveProperty('participants');
      expect(data.data.participants).toHaveLength(1);
    });
    
    test('fetches list of appointments with filters', async () => {
      const request = createMockGetRequest({
        startDate: '2025-10-01T00:00:00Z',
        endDate: '2025-10-31T23:59:59Z',
        type: [AppointmentType.CARE_EVALUATION],
        status: [AppointmentStatus.PENDING],
        homeId: 'home-123'
      });
      
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0]).toHaveProperty('id', 'appt-123');
      
      // Verify prisma was called with correct filters
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: expect.any(Object),
            endTime: expect.any(Object),
            type: expect.any(Object),
            status: expect.any(Object),
            homeId: 'home-123',
          })
        })
      );
    });
  });
  
  describe('POST /api/calendar/appointments', () => {
    const validAppointmentData = {
      type: AppointmentType.CARE_EVALUATION,
      title: 'New Appointment',
      description: 'Test description',
      startTime: '2025-10-20T14:00:00Z',
      endTime: '2025-10-20T15:00:00Z',
      location: { address: '123 Test St' },
      homeId: 'home-123',
      participants: [
        { userId: 'user-456', name: 'Participant', role: 'CAREGIVER' }
      ]
    };
    
    const validBookingRequest = {
      type: AppointmentType.CARE_EVALUATION,
      title: 'Booking Request',
      requestedStartTime: '2025-10-20T14:00:00Z',
      requestedEndTime: '2025-10-20T15:00:00Z',
      participants: [
        { userId: 'user-456', name: 'Participant', role: 'CAREGIVER', required: true }
      ]
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockJsonRequest(validAppointmentData);
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('creates a direct appointment successfully', async () => {
      const request = createMockJsonRequest(validAppointmentData);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id', 'appt-123');
      expect(data.data).toHaveProperty('title', 'Test Appointment');
      
      // Verify prisma create was called with correct data
      expect(prisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: validAppointmentData.type,
            title: validAppointmentData.title,
            createdById: mockUser.id
          })
        })
      );
      
      // Verify participants were created
      expect(prisma.appointmentParticipant.createMany).toHaveBeenCalled();
    });
    
    test('handles booking request with conflicts', async () => {
      // Mock conflict check to return conflicts
      (prisma.appointment.findMany as jest.Mock).mockImplementationOnce(() => [
        { ...mockAppointment, id: 'conflict-1' }
      ]);
      
      const request = createMockJsonRequest(validBookingRequest);
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('success', false);
      expect(data).toHaveProperty('error', 'Time slot conflicts with existing appointments');
      expect(data).toHaveProperty('conflicts');
      expect(Array.isArray(data.conflicts)).toBe(true);
    });
  });
  
  describe('PUT /api/calendar/appointments', () => {
    const updateData = {
      id: 'appt-123',
      title: 'Updated Title',
      status: AppointmentStatus.CONFIRMED,
      notes: 'Updated notes'
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockJsonRequest(updateData, 'PUT');
      const response = await PUT(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('updates an appointment successfully', async () => {
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        title: 'Updated Title',
        status: AppointmentStatus.CONFIRMED,
        notes: 'Updated notes'
      });
      
      const request = createMockJsonRequest(updateData, 'PUT');
      const response = await PUT(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id', 'appt-123');
      expect(data.data).toHaveProperty('title', 'Updated Title');
      expect(data.data).toHaveProperty('status', AppointmentStatus.CONFIRMED);
      
      // Verify prisma update was called with correct data
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appt-123' },
          data: expect.objectContaining({
            title: 'Updated Title',
            status: AppointmentStatus.CONFIRMED
          })
        })
      );
    });
  });
  
  describe('DELETE /api/calendar/appointments', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockDeleteRequest('appt-123');
      const response = await DELETE(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: 'Unauthorized' });
    });
    
    test('cancels an appointment successfully', async () => {
      (prisma.appointment.update as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        status: AppointmentStatus.CANCELLED
      });
      
      const request = createMockDeleteRequest('appt-123', { reason: 'Testing cancellation' });
      const response = await DELETE(request);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('id', 'appt-123');
      expect(data.data).toHaveProperty('status', AppointmentStatus.CANCELLED);
      expect(data.data.metadata).toHaveProperty('cancelledAt');
      expect(data.data.metadata).toHaveProperty('cancelReason', 'Testing cancellation');
      
      // Verify prisma update was called with correct data
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'appt-123' },
          data: expect.objectContaining({
            status: AppointmentStatus.CANCELLED
          })
        })
      );
    });
    
    test('returns 400 if appointment ID is missing', async () => {
      const url = new URL('https://example.com/api/calendar/appointments');
      const request = {
        nextUrl: url,
        method: 'DELETE',
      } as unknown as NextRequest;
      
      const response = await DELETE(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Appointment ID is required' });
    });
  });
});
