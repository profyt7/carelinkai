import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

// Mock next-auth
jest.mock("next-auth");

// Mock prisma client
jest.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceListing: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    caregiver: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    availabilitySlot: {
      findMany: jest.fn(),
    },
    caregiverReview: {
      findMany: jest.fn(),
    },
  },
}));

// Mock matching functions
jest.mock("@/lib/matching", () => ({
  scoreCaregiverForListing: jest.fn(),
  scoreListingForCaregiver: jest.fn(),
  hasTimeOverlap: jest.fn(),
  getMinutesBetween: jest.fn(),
  calculateDistance: jest.fn(),
}));

// Import mocked modules
import { prisma } from "@/lib/prisma";
import { scoreCaregiverForListing, scoreListingForCaregiver } from "@/lib/matching";

// Import handler to test
import { GET } from "@/app/api/matching/recommendations/route";

describe("Matching Recommendations API", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // Mock data
  const mockListing = {
    id: "listing-123",
    postedByUserId: "user-family-123",
    title: "Need caregiver for elderly parent",
    description: "Looking for experienced caregiver",
    hourlyRateMin: 20,
    hourlyRateMax: 30,
    setting: "HOME",
    careTypes: ["ELDERLY_CARE"],
    services: ["MEDICATION_MANAGEMENT"],
    specialties: ["DEMENTIA"],
    city: "San Francisco",
    state: "CA",
    zipCode: "94105",
    latitude: 37.7749,
    longitude: -122.4194,
    startTime: new Date("2025-10-01T09:00:00Z"),
    endTime: new Date("2025-10-01T17:00:00Z"),
    status: "OPEN",
  };

  const mockCaregiver = {
    id: "caregiver-123",
    userId: "user-caregiver-123",
    bio: "Experienced caregiver",
    yearsExperience: 5,
    hourlyRate: 25,
    specialties: ["DEMENTIA", "ELDERLY_CARE"],
    backgroundCheckStatus: "CLEAR",
  };

  const mockCaregiverWithUser = {
    ...mockCaregiver,
    user: {
      id: "user-caregiver-123",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
      profileImageUrl: null,
    },
  };

  const mockAvailabilitySlots = [
    {
      id: "slot-123",
      userId: "user-caregiver-123",
      startTime: new Date("2025-10-01T08:00:00Z"),
      endTime: new Date("2025-10-01T18:00:00Z"),
      isAvailable: true,
      availableFor: ["CARE_EVALUATION"],
    },
  ];

  const mockReviews = [
    {
      id: "review-123",
      caregiverId: "caregiver-123",
      reviewerId: "user-family-123",
      rating: 4,
      title: "Great service",
      content: "Very professional",
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockListingWithUser = {
    ...mockListing,
    postedBy: {
      id: "user-family-123",
      firstName: "John",
      lastName: "Smith",
      profileImageUrl: null,
    },
  };

  // Helper to create request objects with different query params
  const createRequest = (params: Record<string, string>) => {
    const url = new URL("https://example.com/api/matching/recommendations");
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    // Provide both url (string) and nextUrl (URL) so the route handler
    // can access request.nextUrl.searchParams just like in Next.js runtime.
    return { url: url.toString(), nextUrl: url } as unknown as Request;
  };

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      // Mock unauthenticated session
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);

      const request = createRequest({ target: "caregivers", listingId: "listing-123" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toEqual({ error: "Unauthorized" });
    });
  });

  describe("Caregiver Recommendations", () => {
    it("should return 403 when user role is not FAMILY or OPERATOR", async () => {
      // Mock authenticated session with CAREGIVER role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-caregiver-123", role: "CAREGIVER" },
      });

      const request = createRequest({ target: "caregivers", listingId: "listing-123" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "Only families and operators can request caregiver recommendations" });
    });

    it("should return 400 when listingId is missing", async () => {
      // Mock authenticated session with FAMILY role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-family-123", role: "FAMILY" },
      });

      const request = createRequest({ target: "caregivers" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain("Invalid parameters");
    });

    it("should return 404 when listing is not found", async () => {
      // Mock authenticated session with FAMILY role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-family-123", role: "FAMILY" },
      });

      // Mock listing not found
      (prisma.marketplaceListing.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = createRequest({ target: "caregivers", listingId: "non-existent" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: "Listing not found" });
    });

    it("should return 403 when user is not the owner of the listing", async () => {
      // Mock authenticated session with FAMILY role but different user ID
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-family-456", role: "FAMILY" },
      });

      // Mock listing found but with different owner
      (prisma.marketplaceListing.findUnique as jest.Mock).mockResolvedValueOnce(mockListing);

      const request = createRequest({ target: "caregivers", listingId: "listing-123" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "You don't have access to this listing" });
    });

    it("should return sorted caregivers with scores when successful", async () => {
      // Mock authenticated session with FAMILY role and matching user ID
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-family-123", role: "FAMILY" },
      });

      // Mock listing found with matching owner
      (prisma.marketplaceListing.findUnique as jest.Mock).mockResolvedValueOnce(mockListing);

      // Mock candidate caregivers
      (prisma.caregiver.findMany as jest.Mock).mockResolvedValueOnce([
        { ...mockCaregiverWithUser, id: "caregiver-123" },
        { ...mockCaregiverWithUser, id: "caregiver-456", hourlyRate: 30 },
      ]);

      // Mock availability slots
      (prisma.availabilitySlot.findMany as jest.Mock).mockResolvedValue(mockAvailabilitySlots);

      // Mock reviews
      (prisma.caregiverReview.findMany as jest.Mock).mockResolvedValue(mockReviews);

      // Mock scoring function with predictable scores
      (scoreCaregiverForListing as jest.Mock)
        .mockReturnValueOnce({
          score: 85,
          reasons: ["Great match for specialty requirements"],
          factors: { distance: { score: 90, weight: 20 } },
        })
        .mockReturnValueOnce({
          score: 90,
          reasons: ["Perfect availability match"],
          factors: { distance: { score: 95, weight: 20 } },
        });

      const request = createRequest({ target: "caregivers", listingId: "listing-123" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("items");
      expect(data.items).toHaveLength(2);
      
      // Items should be sorted by score descending
      expect(data.items[0].score).toBe(90);
      expect(data.items[1].score).toBe(85);
      
      // Check structure of returned items
      expect(data.items[0]).toHaveProperty("type", "caregiver");
      expect(data.items[0]).toHaveProperty("id");
      expect(data.items[0]).toHaveProperty("score");
      expect(data.items[0]).toHaveProperty("reasons");
      expect(data.items[0]).toHaveProperty("data");
      expect(data.items[0].data).toHaveProperty("user");
      expect(data.items[0].data).toHaveProperty("hourlyRate");
      expect(data.items[0].data).toHaveProperty("specialties");
    });
  });

  describe("Listing Recommendations", () => {
    it("should return 403 when user role is not CAREGIVER", async () => {
      // Mock authenticated session with FAMILY role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-family-123", role: "FAMILY" },
      });

      const request = createRequest({ target: "listings" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toEqual({ error: "Only caregivers can request listing recommendations" });
    });

    it("should return 404 when caregiver profile is not found", async () => {
      // Mock authenticated session with CAREGIVER role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-caregiver-123", role: "CAREGIVER" },
      });

      // Mock caregiver not found
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = createRequest({ target: "listings" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toEqual({ error: "Caregiver profile not found" });
    });

    it("should return sorted listings with scores when successful", async () => {
      // Mock authenticated session with CAREGIVER role
      (getServerSession as jest.Mock).mockResolvedValueOnce({
        user: { id: "user-caregiver-123", role: "CAREGIVER" },
      });

      // Mock caregiver found
      (prisma.caregiver.findUnique as jest.Mock).mockResolvedValueOnce(mockCaregiver);

      // Mock candidate listings
      (prisma.marketplaceListing.findMany as jest.Mock).mockResolvedValueOnce([
        { ...mockListingWithUser, id: "listing-123" },
        { ...mockListingWithUser, id: "listing-456", hourlyRateMax: 40 },
      ]);

      // Mock availability slots
      (prisma.availabilitySlot.findMany as jest.Mock).mockResolvedValue(mockAvailabilitySlots);

      // Mock reviews
      (prisma.caregiverReview.findMany as jest.Mock).mockResolvedValue(mockReviews);

      // Mock scoring function with predictable scores
      (scoreListingForCaregiver as jest.Mock)
        .mockReturnValueOnce({
          score: 75,
          reasons: ["Good match for your specialties"],
          factors: { distance: { score: 80, weight: 20 } },
        })
        .mockReturnValueOnce({
          score: 95,
          reasons: ["Perfect rate match for your profile"],
          factors: { distance: { score: 90, weight: 20 } },
        });

      const request = createRequest({ target: "listings" });
      const response = await GET(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("items");
      expect(data.items).toHaveLength(2);
      
      // Items should be sorted by score descending
      expect(data.items[0].score).toBe(95);
      expect(data.items[1].score).toBe(75);
      
      // Check structure of returned items
      expect(data.items[0]).toHaveProperty("type", "listing");
      expect(data.items[0]).toHaveProperty("id");
      expect(data.items[0]).toHaveProperty("score");
      expect(data.items[0]).toHaveProperty("reasons");
      expect(data.items[0]).toHaveProperty("data");
      expect(data.items[0].data).toHaveProperty("title");
      expect(data.items[0].data).toHaveProperty("hourlyRateMin");
      expect(data.items[0].data).toHaveProperty("hourlyRateMax");
      expect(data.items[0].data).toHaveProperty("specialties");
    });
  });
});
