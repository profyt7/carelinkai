import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("next-auth");

jest.mock("@/lib/prisma", () => ({
  prisma: {
    assistedLivingHome: {
      findMany: jest.fn(),
    },
  },
}));

// Force provider fallback to avoid network calls
jest.mock("@/lib/ai/provider", () => {
  const actual = jest.requireActual("@/lib/ai/provider");
  return {
    ...actual,
    getEmbeddingProvider: () => ({
      name: "fallback",
      isAvailable: () => true,
      embed: async (t: string) => Array(8).fill(0).map((_, i) => (t.length % (i + 3)) / 10),
    }),
  };
});

import { prisma } from "@/lib/prisma";
import { POST } from "@/app/api/ai/match/resident/route";

describe("AI Resident Matching API", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const createRequest = (body: any, params: Record<string, string> = {}) => {
    const url = new URL("https://example.com/api/ai/match/resident");
    Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    return new Request(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as unknown as Request;
  };

  it("returns 401 if unauthenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce(null);
    const req = createRequest({ budget: { max: 5000 } });
    const res = await POST(req as any);
    expect(res).toBeInstanceOf(NextResponse);
    expect(res.status).toBe(401);
  });

  it("returns 403 for unsupported role", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "u1", role: "CAREGIVER" } });
    const req = createRequest({ budget: { max: 5000 } });
    const res = await POST(req as any);
    expect(res.status).toBe(403);
  });

  it("validates body and returns 400 on invalid input", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "u1", role: "FAMILY" } });
    const req = createRequest({ budget: { max: "oops" } });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("returns matched homes with scores", async () => {
    (getServerSession as jest.Mock).mockResolvedValueOnce({ user: { id: "u1", role: "FAMILY" } });

    // Mock 2 active homes
    (prisma.assistedLivingHome.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "home-1",
        name: "Sunny Care",
        description: "Great assisted living with garden",
        status: "ACTIVE",
        careLevel: ["ASSISTED"],
        capacity: 30,
        genderRestriction: null,
        priceMin: 4000,
        priceMax: 5500,
        amenities: ["Garden", "Private Rooms"],
        address: { city: "SF", state: "CA", latitude: 37.77, longitude: -122.42 },
        photos: [],
      },
      {
        id: "home-2",
        name: "Memories Home",
        description: "Specialized memory care",
        status: "ACTIVE",
        careLevel: ["MEMORY_CARE"],
        capacity: 20,
        genderRestriction: null,
        priceMin: 6000,
        priceMax: 7500,
        amenities: ["Activity Room"],
        address: { city: "SF", state: "CA", latitude: 37.79, longitude: -122.41 },
        photos: [],
      },
    ]);

    const body = {
      age: 82,
      gender: "FEMALE",
      careLevelNeeded: ["ASSISTED"],
      budget: { max: 6000 },
      preferredAmenities: ["Garden"],
    };

    const req = createRequest(body, { limit: "5" });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty("items");
    expect(Array.isArray(data.items)).toBe(true);
    expect(data.items.length).toBeGreaterThan(0);
    expect(data.items[0]).toHaveProperty("scores");
    expect(data.items[0].scores).toHaveProperty("combined");
  });
});
