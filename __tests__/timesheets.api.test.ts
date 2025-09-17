/**
 * Unit tests for Timesheets API
 *
 * Tests the endpoints:
 * - GET /api/timesheets
 * - POST /api/timesheets/start
 * - POST /api/timesheets/end
 * - POST /api/timesheets/[id]/approve
 */

import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as listTimesheets } from '@/app/api/timesheets/route';
import { POST as startTimesheet } from '@/app/api/timesheets/start/route';
import { POST as endTimesheet } from '@/app/api/timesheets/end/route';
import { POST as approveTimesheet } from '@/app/api/timesheets/[id]/approve/route';

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
      caregiverShift: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      timesheet: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helpers to create mock NextRequest
function createGetRequest(path = 'https://example.com/api/timesheets') {
  const url = new URL(path);
  return { nextUrl: url, method: 'GET' } as unknown as NextRequest;
}

function createPostRequest(path: string, body: any) {
  const url = new URL(path);
  const req = { nextUrl: url, method: 'POST', json: jest.fn().mockResolvedValue(body) } as unknown as NextRequest;
  return req;
}

// Common test data
const mockCaregiverUser = { id: 'user-caregiver-1', email: 'cg@example.com', name: 'CG' };
const mockOperatorUser = { id: 'user-operator-1', email: 'op@example.com', name: 'OP' };
const mockCaregiver = { id: 'caregiver-1', userId: mockCaregiverUser.id };
const mockOperator = { id: 'operator-1', userId: mockOperatorUser.id };
const mockHome = { id: 'home-1', name: 'Home A', operatorId: mockOperator.id };
const mockShiftAssigned = {
  id: 'shift-1',
  homeId: mockHome.id,
  caregiverId: mockCaregiver.id,
  startTime: new Date('2025-10-01T09:00:00Z'),
  endTime: new Date('2025-10-01T17:00:00Z'),
  status: 'ASSIGNED',
  hourlyRate: { toString: () => '25.00' },
  notes: 'Shift',
  timesheet: null,
};
const mockShiftInProgress = { ...mockShiftAssigned, status: 'IN_PROGRESS' };
const mockTimesheetDraft = {
  id: 'ts-1',
  shiftId: mockShiftAssigned.id,
  caregiverId: mockCaregiver.id,
  startTime: new Date('2025-10-01T09:00:00Z'),
  endTime: null,
  breakMinutes: 0,
  status: 'DRAFT',
  notes: null,
  approvedById: null,
  approvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  shift: { id: mockShiftAssigned.id, startTime: mockShiftAssigned.startTime, endTime: mockShiftAssigned.endTime, home: { id: mockHome.id, name: mockHome.name } },
};
const mockTimesheetSubmitted = { ...mockTimesheetDraft, status: 'SUBMITTED', endTime: new Date('2025-10-01T17:00:00Z') };
const mockTimesheetApproved = { ...mockTimesheetSubmitted, status: 'APPROVED', approvedById: mockOperatorUser.id, approvedAt: new Date() };

// Tests

describe('Timesheets API', () => {
  describe('GET /api/timesheets', () => {
    test('401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const res = await listTimesheets(createGetRequest());
      expect(res.status).toBe(401);
    });

    test('returns caregiver timesheets', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.timesheet.findMany as jest.Mock).mockResolvedValueOnce([mockTimesheetDraft]);

      const res = await listTimesheets(createGetRequest());
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.timesheets)).toBe(true);
      expect(prisma.timesheet.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { caregiverId: mockCaregiver.id } }));
    });

    test('returns operator timesheets', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findMany as jest.Mock).mockResolvedValueOnce([mockTimesheetSubmitted]);

      const res = await listTimesheets(createGetRequest());
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.timesheets)).toBe(true);
      expect(prisma.timesheet.findMany).toHaveBeenCalled();
    });
  });

  describe('POST /api/timesheets/start', () => {
    test('401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/start', { shiftId: mockShiftAssigned.id });
      const res = await startTimesheet(req);
      expect(res.status).toBe(401);
    });

    test('403 when not caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/start', { shiftId: mockShiftAssigned.id });
      const res = await startTimesheet(req);
      expect(res.status).toBe(403);
    });

    test('404 when shift not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/start', { shiftId: 'nope' });
      const res = await startTimesheet(req);
      expect(res.status).toBe(404);
    });

    test('403 when shift not assigned to caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockShiftAssigned, caregiverId: 'other' });
      const req = createPostRequest('https://example.com/api/timesheets/start', { shiftId: mockShiftAssigned.id });
      const res = await startTimesheet(req);
      expect(res.status).toBe(403);
    });

    test('409 when shift status is not ASSIGNED', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockShiftAssigned, status: 'OPEN' });
      const req = createPostRequest('https://example.com/api/timesheets/start', { shiftId: mockShiftAssigned.id });
      const res = await startTimesheet(req);
      expect(res.status).toBe(409);
    });

    test('409 when timesheet already exists', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockShiftAssigned, timesheet: mockTimesheetDraft });
      const req = createPostRequest('https://example.com/api/timesheets/start', { shiftId: mockShiftAssigned.id });
      const res = await startTimesheet(req);
      expect(res.status).toBe(409);
    });

    test('successfully starts a timesheet and sets shift IN_PROGRESS', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.caregiverShift.findUnique as jest.Mock).mockResolvedValueOnce(mockShiftAssigned);
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([
        mockShiftInProgress,
        mockTimesheetDraft,
      ]);

      const req = createPostRequest('https://example.com/api/timesheets/start', { shiftId: mockShiftAssigned.id });
      const res = await startTimesheet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.timesheet).toHaveProperty('id', mockTimesheetDraft.id);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/timesheets/end', () => {
    test('401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/end', { timesheetId: mockTimesheetDraft.id });
      const res = await endTimesheet(req);
      expect(res.status).toBe(401);
    });

    test('403 when not caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/end', { timesheetId: mockTimesheetDraft.id });
      const res = await endTimesheet(req);
      expect(res.status).toBe(403);
    });

    test('404 when timesheet not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/end', { timesheetId: 'missing' });
      const res = await endTimesheet(req);
      expect(res.status).toBe(404);
    });

    test('403 when timesheet belongs to different caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTimesheetDraft, caregiverId: 'other' });
      const req = createPostRequest('https://example.com/api/timesheets/end', { timesheetId: mockTimesheetDraft.id });
      const res = await endTimesheet(req);
      expect(res.status).toBe(403);
    });

    test('409 when timesheet already ended', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(mockTimesheetSubmitted);
      const req = createPostRequest('https://example.com/api/timesheets/end', { timesheetId: mockTimesheetDraft.id });
      const res = await endTimesheet(req);
      expect(res.status).toBe(409);
    });

    test('successfully ends a timesheet and completes shift', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockCaregiverUser });
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTimesheetDraft, shift: { id: mockShiftAssigned.id } });
      (prisma.$transaction as jest.Mock).mockResolvedValueOnce([
        { ...mockShiftAssigned, status: 'COMPLETED' },
        mockTimesheetSubmitted,
      ]);

      const req = createPostRequest('https://example.com/api/timesheets/end', { timesheetId: mockTimesheetDraft.id, breakMinutes: 15, notes: 'Good shift' });
      const res = await endTimesheet(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.timesheet.status).toBe('SUBMITTED');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /api/timesheets/[id]/approve', () => {
    test('401 when unauthenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/ts-1/approve', {});
      const res = await approveTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(401);
    });

    test('403 when not operator', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/ts-1/approve', {});
      const res = await approveTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(403);
    });

    test('404 when timesheet not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest('https://example.com/api/timesheets/ts-1/approve', {});
      const res = await approveTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(404);
    });

    test('403 when timesheet home not operated by operator', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTimesheetSubmitted, shift: { home: { operatorId: 'different' } } });
      const req = createPostRequest('https://example.com/api/timesheets/ts-1/approve', {});
      const res = await approveTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(403);
    });

    test('409 when timesheet status is not SUBMITTED', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTimesheetDraft, shift: { home: { operatorId: mockOperator.id } } });
      const req = createPostRequest('https://example.com/api/timesheets/ts-1/approve', {});
      const res = await approveTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(409);
    });

    test('successfully approves a timesheet', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({ user: mockOperatorUser });
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(mockOperator);
      (prisma.timesheet.findUnique as jest.Mock).mockResolvedValueOnce({ ...mockTimesheetSubmitted, shift: { home: { operatorId: mockOperator.id } } });
      (prisma.timesheet.update as jest.Mock).mockResolvedValueOnce(mockTimesheetApproved);
      const req = createPostRequest('https://example.com/api/timesheets/ts-1/approve', {});
      const res = await approveTimesheet(req, { params: { id: 'ts-1' } });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.timesheet.status).toBe('APPROVED');
    });
  });
});
