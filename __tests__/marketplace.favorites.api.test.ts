/**
 * Unit tests for Marketplace Favorites API
 *
 * Endpoints:
 * - GET /api/marketplace/favorites
 * - POST /api/marketplace/favorites
 * - DELETE /api/marketplace/favorites?listingId=...
 */

import { jest } from '@jest/globals';
import { GET, POST, DELETE } from '@/app/api/marketplace/favorites/route';

// Mock Next Auth (note: route imports from 'next-auth/next')
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock auth options (default export in this codebase)
jest.mock('@/lib/auth', () => ({
  default: {},
}));

// Mock Prisma client
jest.mock('@/lib/prisma', () => {
  return {
    prisma: {
      caregiver: {
        findUnique: jest.fn(),
      },
      marketplaceListing: {
        findUnique: jest.fn(),
      },
      favoriteListing: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    },
  };
});

// Import mocks after definition
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';

// Helpers to build Request-like objects expected by route handlers
function createPostRequest(body: any) {
  return {
    method: 'POST',
    json: jest.fn().mockResolvedValue(body),
    url: 'https://example.com/api/marketplace/favorites',
  } as unknown as Request;
}

function createDeleteRequest(listingId?: string) {
  const url = new URL('https://example.com/api/marketplace/favorites');
  if (listingId) url.searchParams.set('listingId', listingId);
  return {
    method: 'DELETE',
    url: url.toString(),
  } as unknown as Request;
}

describe('Marketplace Favorites API', () => {
  const mockUser = { id: 'user-123', email: 'caregiver@example.com' };
  const mockCaregiver = { id: 'caregiver-123', userId: 'user-123' };
  const mockListing = {
    id: 'listing-1',
    title: 'Caregiver Job',
    description: 'Assist with daily activities',
    city: 'Seattle',
    state: 'WA',
    status: 'OPEN',
    hourlyRateMin: 25,
    hourlyRateMax: 35,
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    (getServerSession as jest.Mock).mockResolvedValue({ user: mockUser });
    (prisma.caregiver.findUnique as jest.Mock).mockResolvedValue(mockCaregiver);
    (prisma.marketplaceListing.findUnique as jest.Mock).mockResolvedValue(mockListing);
  });

  describe('GET /api/marketplace/favorites', () => {
    test('requires authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const res = await GET();
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Authentication required' });
    });

    test('returns empty list when user is not a caregiver', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [] });
    });

    test('returns favorites with listing data for caregiver', async () => {
      const favs = [
        {
          id: 'fav-1',
          caregiverId: mockCaregiver.id,
          listingId: mockListing.id,
          createdAt: new Date(),
          listing: mockListing,
        },
      ];
      (prisma.favoriteListing.findMany as jest.Mock).mockResolvedValueOnce(favs);

      const res = await GET();
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data).toHaveLength(1);
      expect(body.data[0]).toEqual(
        expect.objectContaining({
          id: 'fav-1',
          listingId: 'listing-1',
          listing: expect.objectContaining({ id: 'listing-1', title: 'Caregiver Job' }),
        }),
      );

      expect(prisma.favoriteListing.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { caregiverId: mockCaregiver.id } }),
      );
    });
  });

  describe('POST /api/marketplace/favorites', () => {
    test('requires authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest({ listingId: 'listing-1' });
      const res = await POST(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Authentication required' });
    });

    test('validates listingId', async () => {
      const req = createPostRequest({});
      const res = await POST(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'listingId is required' });
    });

    test('only caregivers can favorite', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest({ listingId: 'listing-1' });
      const res = await POST(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Only caregivers can favorite listings' });
    });

    test('returns 404 if listing not found', async () => {
      (prisma.marketplaceListing.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createPostRequest({ listingId: 'missing' });
      const res = await POST(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Listing not found' });
    });

    test('returns existing favorite (idempotent) with 200', async () => {
      (prisma.favoriteListing.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'fav-1' });
      const req = createPostRequest({ listingId: mockListing.id });
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: { id: 'fav-1', listingId: mockListing.id } });
    });

    test('creates a new favorite with 201', async () => {
      (prisma.favoriteListing.findUnique as jest.Mock).mockResolvedValueOnce(null);
      (prisma.favoriteListing.create as jest.Mock).mockResolvedValueOnce({ id: 'fav-new' });
      const req = createPostRequest({ listingId: mockListing.id });
      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ data: { id: 'fav-new', listingId: mockListing.id } });
      expect(prisma.favoriteListing.create).toHaveBeenCalledWith({
        data: { caregiverId: mockCaregiver.id, listingId: mockListing.id },
      });
    });
  });

  describe('DELETE /api/marketplace/favorites?listingId=...', () => {
    test('requires authentication', async () => {
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      const req = createDeleteRequest('listing-1');
      const res = await DELETE(req);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Authentication required' });
    });

    test('validates listingId', async () => {
      const req = createDeleteRequest();
      const res = await DELETE(req);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'listingId is required' });
    });

    test('only caregivers can remove favorites', async () => {
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createDeleteRequest('listing-1');
      const res = await DELETE(req);
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: 'Only caregivers can remove favorites' });
    });

    test('returns 404 when favorite does not exist', async () => {
      (prisma.favoriteListing.findUnique as jest.Mock).mockResolvedValueOnce(null);
      const req = createDeleteRequest('listing-1');
      const res = await DELETE(req);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Favorite not found' });
    });

    test('deletes favorite successfully', async () => {
      (prisma.favoriteListing.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'fav-1' });
      const req = createDeleteRequest('listing-1');
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ success: true });
      expect(prisma.favoriteListing.delete).toHaveBeenCalledWith({ where: { id: 'fav-1' } });
    });
  });
});
