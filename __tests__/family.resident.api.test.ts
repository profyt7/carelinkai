import { jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as GET_SUMMARY } from '@/app/api/family/residents/[id]/summary/route';
import { GET as GET_TIMELINE } from '@/app/api/family/residents/[id]/timeline/route';

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
      resident: {
        findUnique: jest.fn(),
      },
      appointment: {
        findMany: jest.fn(),
      },
      familyNote: {
        findMany: jest.fn(),
      },
      familyDocument: {
        findMany: jest.fn(),
      },
    },
  };
});

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

function createGet(path: string) {
  const url = new URL(`https://example.com${path}`);
  return { nextUrl: url, method: 'GET' } as unknown as NextRequest;
}

describe('Family Resident APIs', () => {
  const user = { id: 'user-1', role: 'FAMILY' };
  const resident = {
    id: 'res-1',
    firstName: 'John',
    lastName: 'Doe',
    status: 'ACTIVE',
    dateOfBirth: new Date('1945-05-10T00:00:00Z'),
    admissionDate: new Date('2025-01-01T00:00:00Z'),
    dischargeDate: null,
    familyId: 'fam-1',
    home: { id: 'home-1', name: 'Peaceful Home' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({ user });
    (prisma.resident.findUnique as jest.Mock).mockResolvedValue({
      id: resident.id,
      firstName: resident.firstName,
      lastName: resident.lastName,
      status: resident.status,
      dateOfBirth: resident.dateOfBirth,
      admissionDate: resident.admissionDate,
      dischargeDate: resident.dischargeDate,
      familyId: resident.familyId,
      home: { id: resident.home.id, name: resident.home.name },
      createdAt: resident.createdAt,
      updatedAt: resident.updatedAt,
    });
  });

  describe('GET /api/family/residents/[id]/summary', () => {
    it('returns safe resident summary', async () => {
      const res = await GET_SUMMARY(createGet('/api/family/residents/res-1/summary'), { params: { id: 'res-1' } } as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('id', 'res-1');
      expect(data).toHaveProperty('name', 'John Doe');
      expect(data).toHaveProperty('status', 'ACTIVE');
      expect(data).not.toHaveProperty('medicalConditions');
      expect(data).not.toHaveProperty('medications');
      expect(data).not.toHaveProperty('notes');
      expect(data).toHaveProperty('home');
      expect(data.home).toEqual({ id: 'home-1', name: 'Peaceful Home' });
    });
  });

  describe('GET /api/family/residents/[id]/timeline', () => {
    it('returns aggregated timeline items without PHI', async () => {
      (prisma.appointment.findMany as jest.Mock).mockResolvedValue([
        { id: 'a1', title: 'Checkup', type: 'MEDICAL_APPOINTMENT', status: 'CONFIRMED', startTime: new Date(), endTime: new Date() },
      ]);
      (prisma.familyNote.findMany as jest.Mock).mockResolvedValue([
        { id: 'n1', title: 'Family added a note', createdAt: new Date() },
      ]);
      (prisma.familyDocument.findMany as jest.Mock).mockResolvedValue([
        { id: 'd1', title: 'Insurance doc', type: 'INSURANCE_DOCUMENT', createdAt: new Date() },
      ]);

      const res = await GET_TIMELINE(createGet('/api/family/residents/res-1/timeline'), { params: { id: 'res-1' } } as any);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.items)).toBe(true);
      expect(data.items.length).toBeGreaterThan(0);
      // No fileUrl exposed in document items
      const doc = data.items.find((i: any) => i.kind === 'document');
      expect(doc).toBeDefined();
      expect(doc).not.toHaveProperty('fileUrl');
    });
  });
});
