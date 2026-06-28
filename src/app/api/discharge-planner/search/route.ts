/**
 * POST /api/discharge-planner/search
 * AI-powered placement search for discharge planners
 * Parses natural language queries and matches homes
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { captureError } from "@/lib/sentry";
import { getAnthropicClient, requireAnthropicKey } from "@/lib/ai/claude";
import { sanitizeCareLevels, buildLocationWhere } from "@/lib/discharge-planner/criteria";

// Sentinel operator that owns unclaimed/directory listings — must never surface to a DP.
const DIRECTORY_UNCLAIMED_EMAIL = "directory-unclaimed@carelinkai.system";

const searchRequestSchema = z.object({
  query: z.string().min(10, "Query must be at least 10 characters"),
});

type ParsedCriteria = {
  timeline?: string;
  urgency?: string;
  paymentType?: string[];
  gender?: string;
  age?: number;
  medicalConditions?: string[];
  mobilityNeeds?: string[];
  cognitiveStatus?: string[];
  preferences?: string[];
  location?: string;
  careLevel?: string[];
};

export async function POST(request: NextRequest) {
  console.log("🏥 [DISCHARGE-PLANNER] Search request received");

  try {
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);

    const body = await request.json();
    const { query } = searchRequestSchema.parse(body);

    requireAnthropicKey();
    const client = getAnthropicClient();

    console.log("🏥 [DISCHARGE-PLANNER] Processing query:", query);

    const searchRecord = await prisma.placementSearch.create({
      data: {
        userId: user.id,
        queryText: query,
        parsedCriteria: {},
        searchResults: {},
        status: "SEARCHING",
      },
    });

    // Stage 1: Parse natural language query into structured criteria
    console.log("🏥 [DISCHARGE-PLANNER] Stage 1: Parsing criteria...");

    const parsePrompt = `You are an expert in senior care placement. Extract structured criteria from the following request:

"${query}"

Extract the following information and return raw JSON only (no markdown, no code blocks):
{
  "timeline": "urgency or move-in date (e.g., '3 days', 'ASAP', 'next month')",
  "urgency": "LOW, MEDIUM, or HIGH",
  "paymentType": ["Medicaid", "Private Pay", "Insurance", "VA Benefits"],
  "gender": "Male, Female, or Any",
  "age": "estimated age if mentioned",
  "medicalConditions": ["list of conditions mentioned"],
  "mobilityNeeds": ["walker", "wheelchair", "ambulatory", etc.],
  "cognitiveStatus": ["no dementia", "early dementia", "advanced dementia"],
  "preferences": ["pets", "private room", "shared room", etc.],
  "location": "city, state, or area",
  "careLevel": ["INDEPENDENT", "ASSISTED", "MEMORY_CARE", "SKILLED_NURSING"]
}

For careLevel, use ONLY these exact values: INDEPENDENT, ASSISTED, MEMORY_CARE, SKILLED_NURSING. Map "assisted living" to ASSISTED.`;

    const parseResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: "You are a senior care placement expert. Extract criteria accurately. Return raw JSON only with no markdown or code blocks.",
      messages: [{ role: "user", content: parsePrompt }],
    });

    const parseBlock = parseResponse.content[0];
    const parseRaw = parseBlock.type === "text" ? parseBlock.text.trim() : "{}";
    const parseJson = parseRaw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let parsedCriteria: ParsedCriteria = {};
    try {
      parsedCriteria = JSON.parse(parseJson);
    } catch (e) {
      console.error("🏥 [DISCHARGE-PLANNER] ❌ Failed to parse criteria JSON", e);
    }

    console.log("🏥 [DISCHARGE-PLANNER] ✅ Parsed criteria:", parsedCriteria);

    // Stage 2: Query database for matching homes
    console.log("🏥 [DISCHARGE-PLANNER] Stage 2: Querying homes...");

    const whereClause: any = { status: "ACTIVE" };

    // careLevel is a CareLevel[] list, so hasSome is correct — but the values
    // must be valid enum members. Sanitize the AI output (it historically
    // emitted "ASSISTED_LIVING", which is not a CareLevel and made Prisma
    // throw PrismaClientValidationError).
    const careLevels = sanitizeCareLevels(parsedCriteria?.careLevel);
    if (careLevels.length > 0) {
      whereClause.careLevel = { hasSome: careLevels };
    }

    // Match city/state against the correct fields instead of comparing the
    // full location string against both.
    const addressWhere = buildLocationWhere(parsedCriteria?.location);
    if (addressWhere) {
      whereClause.address = addressWhere;
    }

    if (parsedCriteria?.gender && parsedCriteria.gender !== "Any") {
      whereClause.OR = [
        { genderRestriction: null },
        { genderRestriction: parsedCriteria.gender },
      ];
    }

    const homes = await prisma.assistedLivingHome.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        description: true,
        careLevel: true,
        amenities: true,
        priceMin: true,
        priceMax: true,
        capacity: true,
        currentOccupancy: true,
        genderRestriction: true,
        status: true,
        address: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
            latitude: true,
            longitude: true,
          },
        },
        photos: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
        operator: {
          select: {
            companyName: true,
            user: {
              select: { email: true, phone: true },
            },
          },
        },
      },
      take: 20,
    });

    console.log(`🏥 [DISCHARGE-PLANNER] Found ${homes.length} candidate homes`);

    if (homes.length === 0) {
      await prisma.placementSearch.update({
        where: { id: searchRecord.id },
        data: {
          parsedCriteria,
          searchResults: { homes: [] },
          status: "COMPLETED",
        },
      });

      return NextResponse.json({
        searchId: searchRecord.id,
        query,
        totalMatches: 0,
        matches: [],
        message: "No matching homes found. Try broadening your search criteria.",
      });
    }

    // Stage 3: AI scoring and ranking
    console.log("🏥 [DISCHARGE-PLANNER] Stage 3: AI scoring homes...");

    const homesData = homes.map((h) => ({
      id: h.id,
      name: h.name,
      description: h.description,
      careLevel: h.careLevel,
      amenities: h.amenities,
      capacity: h.capacity,
      currentOccupancy: h.currentOccupancy,
      availableBeds: h.capacity - h.currentOccupancy,
      priceRange: `$${h.priceMin ?? 0}-$${h.priceMax ?? 0}/month`,
      location: `${h.address?.city ?? ""}, ${h.address?.state ?? ""}`,
      genderRestriction: h.genderRestriction ?? "Any",
    }));

    const scoringPrompt = `You are a senior care placement expert. Score and rank these homes for the following request:

REQUEST: "${query}"

PARSED CRITERIA:
${JSON.stringify(parsedCriteria, null, 2)}

AVAILABLE HOMES:
${JSON.stringify(homesData, null, 2)}

Return the top 5 best matches as raw JSON only (no markdown, no code blocks):
{
  "matches": [
    {
      "homeId": "home_id",
      "score": 95,
      "reasoning": "This home excels in...",
      "confidence": "HIGH"
    }
  ]
}

Consider: timeline urgency/bed availability, care level match, payment type, location, amenities, overall fit.`;

    const scoringResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: "You are a senior care placement expert. Score homes accurately based on criteria match. Return raw JSON only with no markdown or code blocks.",
      messages: [{ role: "user", content: scoringPrompt }],
    });

    const scoringBlock = scoringResponse.content[0];
    const scoringRaw = scoringBlock.type === "text" ? scoringBlock.text.trim() : "{}";
    const scoringJson = scoringRaw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

    let scoringResults: { matches: any[] } = { matches: [] };
    try {
      scoringResults = JSON.parse(scoringJson);
    } catch (e) {
      console.error("🏥 [DISCHARGE-PLANNER] ❌ Failed to parse scoring JSON", e);
      scoringResults = {
        matches: homes.slice(0, 5).map((h) => ({
          homeId: h.id,
          score: 70,
          reasoning: "Match based on basic criteria filtering",
          confidence: "MEDIUM",
        })),
      };
    }

    console.log("🏥 [DISCHARGE-PLANNER] ✅ Scoring results:", scoringResults);

    const matches = (scoringResults.matches ?? [])
      .map((match: any) => {
        const home = homes.find((h) => h.id === match.homeId);
        if (!home) return null;

        const addressString = home.address
          ? `${home.address.street}, ${home.address.city}, ${home.address.state} ${home.address.zipCode}`
          : "Address not available";

        // Unclaimed/directory listings are owned by the sentinel operator. Never
        // expose that internal address (or any operator contact) to a DP — and
        // treat their price/occupancy data as UNVERIFIED so the card shows a
        // neutral state instead of a misleading "$0/mo" / "0 beds".
        const ownerEmail = (home.operator?.user?.email ?? "").toLowerCase();
        const isUnclaimed = ownerEmail === DIRECTORY_UNCLAIMED_EMAIL;
        const priceMin = home.priceMin != null ? parseFloat(home.priceMin.toString()) : 0;
        const beds = home.capacity - home.currentOccupancy;

        return {
          homeId: home.id,
          homeName: home.name,
          address: addressString,
          score: match.score ?? 0,
          reasoning: match.reasoning ?? "Good match",
          careTypes: home.careLevel,
          // null = unverified/unknown → card shows "Availability on request", not 0.
          availableBeds: isUnclaimed || !(home.capacity > 0) ? null : beds,
          // null = pricing not verified → card shows "Pricing not verified", not "$0/mo".
          startingPrice: priceMin > 0 ? priceMin : null,
          amenities: home.amenities,
          // Never leak the sentinel address; unclaimed leads route via CareLinkAI.
          contactEmail: isUnclaimed ? undefined : home.operator?.user?.email ?? undefined,
          contactPhone: isUnclaimed ? undefined : home.operator?.user?.phone ?? undefined,
          isUnclaimed,
        };
      })
      .filter((m) => m !== null);

    await prisma.placementSearch.update({
      where: { id: searchRecord.id },
      data: {
        parsedCriteria,
        searchResults: { matches },
        status: "COMPLETED",
      },
    });

    console.log(`🏥 [DISCHARGE-PLANNER] ✅ Search completed with ${matches.length} matches`);

    return NextResponse.json({
      searchId: searchRecord.id,
      query,
      totalMatches: matches.length,
      matches,
    });
  } catch (error: any) {
    // A bad/short query is a client error; surface its validation message.
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid search query." },
        { status: 400 }
      );
    }

    // Everything else (Prisma validation errors, AI/network failures, etc.)
    // is logged server-side only and returned to the client as a generic
    // message — never leak query shape or schema field names to end users.
    console.error("🏥 [DISCHARGE-PLANNER] ❌ Error:", error);

    captureError(error as Error, {
      tags: {
        api: "discharge-planner-search",
        endpoint: "/api/discharge-planner/search",
      },
      extra: { method: request.method },
    });

    return NextResponse.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 500 }
    );
  }
}
