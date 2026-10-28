export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { matchHomesForResident } from "@/lib/ai/residentMatching";

const residentSchema = z.object({
  age: z.number().int().positive().optional(),
  gender: z.string().optional(),
  careLevelNeeded: z.array(z.string()).optional(),
  mobilityLevel: z.number().min(1).max(5).optional(),
  medicationManagement: z.boolean().optional(),
  incontinenceCare: z.boolean().optional(),
  diabetesCare: z.boolean().optional(),
  memoryImpairment: z.number().min(1).max(5).optional(),
  behavioralIssues: z.boolean().optional(),
  budget: z
    .object({ min: z.number().optional(), max: z.number() })
    .partial({ min: true })
    .optional(),
  preferredLocation: z
    .object({
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      zipCode: z.string().optional(),
      maxDistance: z.number().optional(),
    })
    .optional(),
  preferredAmenities: z.array(z.string()).optional(),
  activityPreferences: z.array(z.string()).optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  religiousPreferences: z.string().optional(),
  preferredRoomType: z.string().optional(),
  petFriendly: z.boolean().optional(),
  familyVisitFrequency: z.number().min(1).max(5).optional(),
  proximityToFamily: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
      importance: z.number().min(1).max(5),
    })
    .optional(),
  medicalConditions: z.array(z.string()).optional(),
  specializedCareNeeds: z.array(z.string()).optional(),
  socialEngagement: z.number().min(1).max(5).optional(),
  communitySize: z
    .object({ preferred: z.enum(["small", "medium", "large"]), importance: z.number().min(1).max(5) })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // RBAC: allow FAMILY, OPERATOR, ADMIN
    const role = (session.user as any).role;
    if (!role || !["FAMILY", "OPERATOR", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = residentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid resident profile", details: parsed.error.format() }, { status: 400 });
    }

    const urlObj: URL = (request as any).nextUrl ?? new URL(request.url);
    const limit = Number(urlObj.searchParams.get("limit") || 10);
    const semanticWeight = Number(urlObj.searchParams.get("semanticWeight") || 0.3);

    const matches = await matchHomesForResident(parsed.data as any, { limit, semanticWeight });

    // Shape response
    const items = matches.map((m) => ({
      id: m.home.id,
      name: m.home.name,
      description: m.home.description,
      careLevel: m.home.careLevel,
      capacity: m.home.capacity,
      genderRestriction: m.home.genderRestriction,
      priceMin: m.home.priceMin,
      priceMax: m.home.priceMax,
      address: m.home.address,
      photos: m.home.photos,
      scores: m.scores,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("/api/ai/match/resident error", err);
    return NextResponse.json({ error: "Failed to generate matches" }, { status: 500 });
  }
}
