/**
 * Unit tests for Caregiver Credentials API
 * 
 * Tests the endpoints:
 * - GET/POST /api/caregiver/credentials
 * - PATCH/DELETE /api/caregiver/credentials/[id]
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/caregiver/credentials/route';
import { PATCH, DELETE } from '@/app/api/caregiver/credentials/[id]/route';

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
      credential: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest for GET/POST
function createMockRequest(body = null, method = 'GET', searchParams = {}) {
  const url = new URL('https://example.com/api/caregiver/credentials');
  
  // Add search params if provided
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.append(key, value as string);
    });
  }
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

// Helper to create a mock NextRequest for routes with params
function createMockRequestWithParams(params = {}, body = null, method = 'PATCH') {
  const url = new URL(`https://example.com/api/caregiver/credentials/${params.id || 'cred-123'}`);
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

describe('Caregiver Credentials API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'caregiver@example.com',
    name: 'Test Caregiver',
  };
  
  const mockCaregiver = {
    id: 'caregiver-123',
    userId: 'user-123',
  };
  
  const mockCredential = {
    id: 'cred-123',
    caregiverId: 'caregiver-123',
    type: 'CPR Certification',
    issueDate: new Date('2023-01-01'),
    expirationDate: new Date('2025-01-01'),
    documentUrl: 'https://example.com/documents/cpr-cert.pdf',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  beforeEach(() => {
    // Setup default mocks
    (getServerSession as jest.Mock).mockResolvedValue({
      user: mockUser,
    });
    
    (prisma.caregiver.findUnique as jest.Mock).mockResolvedValue(mockCaregiver);
    
    (prisma.credential.findMany as jest.Mock).mockResolvedValue([mockCredential]);
    (prisma.credential.count as jest.Mock).mockResolvedValue(1);
    (prisma.credential.create as jest.Mock).mockResolvedValue(mockCredential);
    (prisma.credential.findUnique as jest.Mock).mockResolvedValue(mockCredential);
  });
  
  describe('GET /api/caregiver/credentials', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest();
      const response = await GET(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('returns credentials with pagination metadata', async () => {
      const mockCredentials = [mockCredential];
      (prisma.credential.findMany as jest.Mock).mockResolvedValueOnce(mockCredentials);
      (prisma.credential.count as jest.Mock).mockResolvedValueOnce(1);
      
      const request = createMockRequest(null, 'GET', { page: '1', limit: '10' });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      // Assert pagination metadata
      expect(data.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
        hasMore: false,
      });

      // Assert credentials array
      expect(Array.isArray(data.credentials)).toBe(true);
      expect(data.credentials).toHaveLength(1);

      // Assert individual credential fields, allowing Date strings
      expect(data.credentials[0]).toEqual(
        expect.objectContaining({
          id: mockCredential.id,
          caregiverId: mockCredential.caregiverId,
          type: mockCredential.type,
          documentUrl: mockCredential.documentUrl,
          isVerified: false,
          issueDate: expect.any(String),
          expirationDate: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      
      // Verify query was called with correct parameters
      expect(prisma.credential.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { caregiverId: mockCaregiver.id },
          skip: 0,
          take: 10
        })
      );
    });
  });
  
  describe('POST /api/caregiver/credentials', () => {
    const validCredentialData = {
      type: 'CPR Certification',
      issueDate: '2023-01-01',
      expirationDate: '2025-01-01',
      documentUrl: 'https://example.com/documents/cpr-cert.pdf'
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest(validCredentialData, 'POST');
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest(validCredentialData, 'POST');
      const response = await POST(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('returns 400 when expirationDate is not after issueDate', async () => {
      const invalidData = {
        ...validCredentialData,
        expirationDate: '2022-01-01' // Before issueDate
      };
      
      const request = createMockRequest(invalidData, 'POST');
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid input");
      expect(data.details).toBeDefined();
    });
    
    test('successfully creates a credential', async () => {
      const request = createMockRequest(validCredentialData, 'POST');
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.credential).toEqual(
        expect.objectContaining({
          id: mockCredential.id,
          caregiverId: mockCredential.caregiverId,
          type: mockCredential.type,
          documentUrl: mockCredential.documentUrl,
          isVerified: mockCredential.isVerified,
          issueDate: expect.any(String),
          expirationDate: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      
      // Verify credential creation
      expect(prisma.credential.create).toHaveBeenCalledWith({
        data: {
          caregiverId: mockCaregiver.id,
          type: validCredentialData.type,
          issueDate: expect.any(Date),
          expirationDate: expect.any(Date),
          documentUrl: validCredentialData.documentUrl,
          isVerified: false
        }
      });
    });
  });
  
  describe('PATCH /api/caregiver/credentials/[id]', () => {
    const updateData = {
      type: 'Updated CPR Certification',
      expirationDate: '2026-01-01'
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: mockCredential.id }, updateData);
      const response = await PATCH(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: mockCredential.id }, updateData);
      const response = await PATCH(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('returns 404 when credential is not found', async () => {
      (prisma.credential.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent-id' }, updateData);
      const response = await PATCH(request, { params: { id: 'non-existent-id' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Credential not found" });
    });
    
    test('returns 403 when credential does not belong to the caregiver', async () => {
      const differentCaregiver = { ...mockCaregiver, id: 'different-caregiver-id' };
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(differentCaregiver);
      
      const request = createMockRequestWithParams({ id: mockCredential.id }, updateData);
      const response = await PATCH(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ 
        error: "You do not have permission to update this credential" 
      });
    });
    
    test('successfully updates credential fields', async () => {
      const updatedCredential = {
        ...mockCredential,
        type: updateData.type,
        expirationDate: new Date(updateData.expirationDate)
      };
      
      (prisma.credential.update as jest.Mock).mockResolvedValueOnce(updatedCredential);
      
      const request = createMockRequestWithParams({ id: mockCredential.id }, updateData);
      const response = await PATCH(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.credential).toEqual(
        expect.objectContaining({
          id: mockCredential.id,
          caregiverId: mockCaregiver.id,
          type: updateData.type,
          documentUrl: mockCredential.documentUrl,
          isVerified: mockCredential.isVerified,
          issueDate: expect.any(String),
          expirationDate: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        }),
      );
      
      // Verify update was called with correct parameters
      expect(prisma.credential.update).toHaveBeenCalledWith({
        where: { id: mockCredential.id },
        data: {
          type: updateData.type,
          expirationDate: expect.any(Date)
        }
      });
    });
  });
  
  describe('DELETE /api/caregiver/credentials/[id]', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: mockCredential.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 403 when user is not a caregiver', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: mockCredential.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "User is not registered as a caregiver" });
    });
    
    test('returns 404 when credential is not found', async () => {
      (prisma.credential.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent-id' }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: 'non-existent-id' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Credential not found" });
    });
    
    test('returns 403 when credential does not belong to the caregiver', async () => {
      const differentCaregiver = { ...mockCaregiver, id: 'different-caregiver-id' };
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(differentCaregiver);
      
      const request = createMockRequestWithParams({ id: mockCredential.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ 
        error: "You do not have permission to delete this credential" 
      });
    });
    
    test('successfully deletes credential', async () => {
      const request = createMockRequestWithParams({ id: mockCredential.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockCredential.id } });
      
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      
      // Verify delete was called with correct parameters
      expect(prisma.credential.delete).toHaveBeenCalledWith({
        where: { id: mockCredential.id }
      });
    });
  });
});
