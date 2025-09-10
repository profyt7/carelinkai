/**
 * Unit tests for Home Reviews API
 * 
 * Tests the endpoints:
 * - GET /api/reviews/homes
 * - POST /api/reviews/homes
 * - PATCH /api/reviews/homes/[id]
 * - DELETE /api/reviews/homes/[id]
 */

import { jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/reviews/homes/route';
import { PATCH, DELETE } from '@/app/api/reviews/homes/[id]/route';

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
      assistedLivingHome: {
        findUnique: jest.fn(),
      },
      homeReview: {
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      family: {
        findUnique: jest.fn(),
      },
      operator: {
        findUnique: jest.fn(),
      },
      booking: {
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
  const url = new URL('https://example.com/api/reviews/homes');
  
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
  const url = new URL(`https://example.com/api/reviews/homes/${params.id || 'review-123'}`);
  
  const request = {
    nextUrl: url,
    method,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
  
  return request;
}

describe('Home Reviews API', () => {
  // Common test data
  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    name: 'Test User',
  };
  
  const mockHomeId = 'home-123';
  
  const mockHome = {
    id: mockHomeId,
    operatorId: 'operator-456',
    name: 'Test Home',
  };
  
  const mockReview = {
    id: 'review-123',
    homeId: mockHomeId,
    reviewerId: mockUser.id,
    rating: 5,
    title: 'Great home',
    content: 'Very clean and professional staff',
    isPublic: true,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const mockFamily = {
    id: 'family-123',
    userId: mockUser.id,
  };
  
  const mockOperator = {
    id: 'operator-456',
    userId: 'operator-user-123',
  };
  
  const mockBooking = {
    id: 'booking-123',
    familyId: mockFamily.id,
    homeId: mockHomeId,
    status: 'CONFIRMED',
  };
  
  describe('GET /api/reviews/homes', () => {
    test('returns 400 when homeId is missing', async () => {
      const request = createMockRequest({});
      const response = await GET(request);
      
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Home ID is required" });
    });
    
    test('returns 404 when home is not found', async () => {
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({ homeId: 'non-existent' });
      const response = await GET(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Home not found" });
    });
    
    test('returns paginated reviews with stats', async () => {
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce({ id: mockHomeId });
      (prisma.homeReview.findMany as jest.Mock).mockResolvedValueOnce([mockReview]);
      (prisma.homeReview.count as jest.Mock).mockResolvedValueOnce(1);
      (prisma.homeReview.aggregate as jest.Mock).mockResolvedValueOnce({
        _avg: { rating: 4.5 },
        _count: { rating: 2 }
      });
      
      const request = createMockRequest({ homeId: mockHomeId, page: '1', limit: '10' });
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
      expect(prisma.homeReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            homeId: mockHomeId,
            isPublic: true
          },
          skip: 0,
          take: 10,
        })
      );
    });
  });
  
  describe('POST /api/reviews/homes', () => {
    const validReviewData = {
      homeId: mockHomeId,
      rating: 5,
      title: 'Great home',
      content: 'Very clean and professional staff',
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
    
    test('returns 404 when home not found', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Home not found" });
    });
    
    test('returns 403 when user is not a family member', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(mockHome);
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Only family members can review homes" });
    });
    
    test('returns 403 when user is the operator of the home', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockHome,
        operatorId: 'operator-123',
      });
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamily);
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'operator-123',
      });
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Operators cannot review their own homes" });
    });
    
    test('returns 409 when user has already reviewed this home', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(mockHome);
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamily);
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.homeReview.findFirst as jest.Mock).mockResolvedValueOnce(mockReview);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "You have already reviewed this home" });
    });
    
    test('returns 403 when user has no booking with the home', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(mockHome);
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamily);
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.homeReview.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.booking.findFirst as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "You do not have permission to review this home" });
    });
    
    test('successfully creates a review', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: mockUser,
      });
      
      (prisma.assistedLivingHome.findUnique as jest.Mock).mockResolvedValueOnce(mockHome);
      (prisma.family.findUnique as jest.Mock).mockResolvedValueOnce(mockFamily);
      (prisma.operator.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.homeReview.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.booking.findFirst as jest.Mock).mockResolvedValueOnce(mockBooking);
      (prisma.homeReview.create as jest.Mock).mockResolvedValueOnce(mockReview);
      
      const request = createMockRequest({}, 'POST');
      request.json = jest.fn().mockResolvedValueOnce(validReviewData);
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.review).toEqual(expect.objectContaining({
        id: mockReview.id,
        homeId: mockReview.homeId,
        rating: mockReview.rating,
      }));
      
      // Verify create was called with correct data
      expect(prisma.homeReview.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          homeId: mockHomeId,
          reviewerId: mockUser.id,
          rating: validReviewData.rating,
          isVerified: false,
        }),
      });
    });
  });
  
  describe('PATCH /api/reviews/homes/[id]', () => {
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
      
      (prisma.homeReview.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent' }, validUpdateData);
      const response = await PATCH(request, { params: { id: 'non-existent' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Review not found" });
    });
    
    test('returns 403 when user is not the review owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, id: 'different-user' },
      });
      
      (prisma.homeReview.findUnique as jest.Mock).mockResolvedValueOnce({
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
      
      (prisma.homeReview.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockReview,
        reviewerId: mockUser.id,
      });
      
      const updatedReview = {
        ...mockReview,
        ...validUpdateData,
        updatedAt: new Date(),
      };
      
      (prisma.homeReview.update as jest.Mock).mockResolvedValueOnce(updatedReview);
      
      const request = createMockRequestWithParams({ id: mockReview.id }, validUpdateData);
      const response = await PATCH(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      // Core field assertions (excluding Date objects)
      expect(data.review).toEqual(
        expect.objectContaining({
          id: updatedReview.id,
          homeId: updatedReview.homeId,
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
      expect(prisma.homeReview.update).toHaveBeenCalledWith({
        where: { id: mockReview.id },
        data: validUpdateData,
      });
    });
  });
  
  describe('DELETE /api/reviews/homes/[id]', () => {
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
      
      (prisma.homeReview.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      const request = createMockRequestWithParams({ id: 'non-existent' }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: 'non-existent' } });
      
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Review not found" });
    });
    
    test('returns 403 when user is not the review owner', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { ...mockUser, id: 'different-user' },
      });
      
      (prisma.homeReview.findUnique as jest.Mock).mockResolvedValueOnce({
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
      
      (prisma.homeReview.findUnique as jest.Mock).mockResolvedValueOnce({
        ...mockReview,
        reviewerId: mockUser.id,
      });
      
      (prisma.homeReview.delete as jest.Mock).mockResolvedValueOnce(mockReview);
      
      const request = createMockRequestWithParams({ id: mockReview.id }, null, 'DELETE');
      const response = await DELETE(request, { params: { id: mockReview.id } });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      
      // Verify delete was called with correct parameters
      expect(prisma.homeReview.delete).toHaveBeenCalledWith({
        where: { id: mockReview.id },
      });
    });
  });
});
