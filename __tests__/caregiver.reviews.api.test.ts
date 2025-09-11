/**
 * Unit tests for Caregiver Reviews API
 * 
 * Tests the endpoints:
 * - GET /api/reviews/caregivers
 * - POST /api/reviews/caregivers
 * - PATCH /api/reviews/caregivers/[id]
 * - DELETE /api/reviews/caregivers/[id]
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/reviews/caregivers/route';
import { PATCH, DELETE } from '@/app/api/reviews/caregivers/[id]/route';

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
      caregiverReview: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      marketplaceHire: {
        findFirst: jest.fn(),
      }
    }
  };
});

// Import mocks after they're defined
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// Helper to create a mock NextRequest for GET
function createMockRequest(searchParams = {}, method = 'GET') {
  const url = new URL('https://example.com/api/reviews/caregivers');
  
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
function createMockRequestWithParams(params = {}, body = null, method = 'PATCH') {
  const url = new URL(`https://example.com/api/reviews/caregivers/${params.id || 'review-123'}`);
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

describe('Caregiver Reviews API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
  };
  
  const mockCaregiverId = 'caregiver-123';
  
  const mockReview = {
    id: 'review-123',
    caregiverId: mockCaregiverId,
    reviewerId: mockUser.id,
    rating: 5,
    title: 'Great caregiver',
    content: 'Very professional and caring',
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const mockMarketplaceHire = {
    id: 'hire-123',
    caregiverId: mockCaregiverId,
    listing: {
      postedByUserId: mockUser.id
    }
  };
  
  describe('GET /api/reviews/caregivers', () => {
    test('returns 400 when caregiverId is missing', async () => {
      const request = createMockRequest({});
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Caregiver ID is required" });
    });
    
    test('returns 404 when caregiver is not found', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({ caregiverId: 'non-existent' });
      const response = await GET(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Caregiver not found" });
    });
    
    test('returns paginated reviews with stats', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce({ id: mockCaregiverId });
      (prisma.caregiverReview.findMany as jest.Mock).mockResolvedValueOnce([mockReview]);
      (prisma.caregiverReview.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.caregiverReview.aggregate as jest.Mock).mockResolvedValueOnce({
        _avg: { rating: 4.5 },
        _count: { rating: 2 }
      });
      
      const request = createMockRequest({ caregiverId: mockCaregiverId, page: '1', limit: '10' });
      const response = await GET(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('reviews');
      expect(data.reviews).toHaveLength(1);
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('stats');
      expect(data.stats).toEqual({
        averageRating: 4.5,
        totalReviews: 2
      });
      
      // Verify query parameters
      expect(prisma.caregiverReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            caregiverId: mockCaregiverId,
            isPublic: true
          },
          skip: 0,
          take: 10,
        })
      );
    });
  });
  
  describe('POST /api/reviews/caregivers', () => {
    const validReviewData = {
      caregiverId: mockCaregiverId,
      rating: 5,
      title: 'Great caregiver',
      content: 'Very professional and caring',
      isPublic: true,
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 400 when input validation fails', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      const invalidData = {
        ...validReviewData,
        rating: 6, // Invalid: must be between 1-5
      };
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(invalidData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toHaveProperty('error', 'Invalid input');
    });
    
    test('returns 404 when caregiver not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Caregiver not found" });
    });
    
    test('returns 409 when user has already reviewed this caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce({ id: mockCaregiverId });
      (prisma.caregiverReview.findFirst as jest.Mock).mockResolvedValueOnce(mockReview);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "You have already reviewed this caregiver" });
    });
    
    test('returns 403 when user has no permission to review the caregiver', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce({ id: mockCaregiverId });
      (prisma.caregiverReview.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.marketplaceHire.findFirst as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "You do not have permission to review this caregiver" });
    });
    
    test('successfully creates a review', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce({ id: mockCaregiverId });
      (prisma.caregiverReview.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.marketplaceHire.findFirst as jest.Mock).mockResolvedValueOnce(mockMarketplaceHire);
      (prisma.caregiverReview.create as jest.Mock).mockResolvedValueOnce(mockReview);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.review).toEqual(expect.objectContaining({
        id: mockReview.id,
        caregiverId: mockReview.caregiverId,
        rating: mockReview.rating,
      }));
      
      // Verify create was called with correct data
      expect(prisma.caregiverReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          caregiverId: mockCaregiverId,
          reviewerId: mockUser.id,
          rating: validReviewData.rating,
        }),
      });
    });
  });
  
  describe('PATCH /api/reviews/caregivers/[id]', () => {
    const validUpdateData = {
      rating: 4,
      title: 'Updated title',
      content: 'Updated content',
    };
    
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: mockReview.id }, validUpdateData);
      const response = await PATCH(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 404 when review not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiverReview.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent' }, validUpdateData);
      const response = await PATCH(request, { params: { id: 'non-existent' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Review not found" });
    });
    
    test('returns 403 when user is not the review owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, id: 'different-user' },
      });
      
      (prisma.caregiverReview.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockReview,
        reviewerId: mockUser.id, // Original reviewer
      });
      
      const request = createMockRequestWithParams({ id: mockReview.id }, validUpdateData);
      const response = await PATCH(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "You do not have permission to update this review" });
    });
    
    test('successfully updates a review', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiverReview.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockReview,
        reviewerId: mockUser.id,
      });
      
      const updatedReview = {
        ...mockReview,
        ...validUpdateData,
        updatedAt: new Date(),
      };
      
      (prisma.caregiverReview.update as jest.Mock).mockResolvedValueOnce(updatedReview);
      
      const request = createMockRequestWithParams({ id: mockReview.id }, validUpdateData);
      const response = await PATCH(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      // Core field assertions (excluding Date objects)
      expect(data.review).toEqual(
        expect.objectContaining({
          id: updatedReview.id,
          caregiverId: updatedReview.caregiverId,
          reviewerId: updatedReview.reviewerId,
          rating: updatedReview.rating,
          title: updatedReview.title,
          content: updatedReview.content,
          isPublic: updatedReview.isPublic,
        }),
      );

      // Ensure timestamps are returned as ISO strings
      expect(typeof data.review.createdAt).toBe('string');
      expect(typeof data.review.updatedAt).toBe('string');

      // Validate updatedAt is a valid date string
      expect(!isNaN(Date.parse(data.review.updatedAt))).toBe(true);
      
      // Verify update was called with correct parameters
      expect(prisma.caregiverReview.update).toHaveBeenCalledWith({
        where: { id: mockReview.id },
        data: validUpdateData,
      });
    });
  });
  
  describe('DELETE /api/reviews/caregivers/[id]', () => {
    test('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: mockReview.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
    
    test('returns 404 when review not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiverReview.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent' }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: 'non-existent' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Review not found" });
    });
    
    test('returns 403 when user is not the review owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, id: 'different-user' },
      });
      
      (prisma.caregiverReview.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockReview,
        reviewerId: mockUser.id, // Original reviewer
      });
      
      const request = createMockRequestWithParams({ id: mockReview.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "You do not have permission to delete this review" });
    });
    
    test('successfully deletes a review', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.caregiverReview.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockReview,
        reviewerId: mockUser.id,
      });
      
      (prisma.caregiverReview.delete as jest.Mock).mockResolvedValueOnce(mockReview);
      
      const request = createMockRequestWithParams({ id: mockReview.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Verify delete was called with correct parameters
      expect(prisma.caregiverReview.delete).toHaveBeenCalledWith({
        where: { id: mockReview.id },
      });
    });
  });
});
