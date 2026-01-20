/**
 * POST /api/discharge-planner/search
 * AI-powered placement search for discharge planners
 * Parses natural language queries and matches homes
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth-utils";
import { UserRole } from "@prisma/client";
import { captureError } from "@/lib/sentry";

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

type HomeMatch = {
  id: string;
  name: string;
  description: string;
  address: any;
  careLevel: string[];
  amenities: string[];
  priceMin: number;
  priceMax: number;
  capacity: number;
  currentOccupancy: number;
  score: number;
  reasoning: string;
  confidence: string;
};

export async function POST(request: NextRequest) {
  console.log("🏥 [DISCHARGE-PLANNER] Search request received");

  try {
    // Require DISCHARGE_PLANNER role
    const user = await requireRole([UserRole.DISCHARGE_PLANNER, UserRole.ADMIN]);

    // Validate request
    const body = await request?.json?.();
    const validatedData = searchRequestSchema?.parse?.(body);
    const { query } = validatedData ?? {};

    // Check for API key
    const apiKey = process.env?.ABACUSAI_API_KEY;
    if (!apiKey) {
      console.error("🏥 [DISCHARGE-PLANNER] ❌ ABACUSAI_API_KEY not found");
      return NextResponse?.json?.(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    console.log("🏥 [DISCHARGE-PLANNER] Processing query:", query);

    // Create placement search record
    const searchRecord = await prisma.placementSearch.create({
      data: {
        userId: user.id,
        queryText: query,
        parsedCriteria: {},
        searchResults: {},
        status: "SEARCHING",
      },
    });

    console.log("🏥 [DISCHARGE-PLANNER] Created search record:", searchRecord.id);

    // Stage 1: Parse natural language query into structured criteria
    console.log("🏥 [DISCHARGE-PLANNER] Stage 1: Parsing criteria...");
    
    const parsePrompt = `You are an expert in senior care placement. Extract structured criteria from the following request:

"${query}"

Extract the following information in JSON format:
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
  "careLevel": ["ASSISTED_LIVING", "MEMORY_CARE", "SKILLED_NURSING"]
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    const parseResponse = await fetch("https://apps.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON?.stringify?.({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a senior care placement expert. Extract criteria accurately." },
          { role: "user", content: parsePrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!parseResponse?.ok) {
      console.error("🏥 [DISCHARGE-PLANNER] ❌ Parse API error:", parseResponse?.status);
      throw new Error("Failed to parse query");
    }

    // Stream and buffer the parsing response
    const reader = parseResponse?.body?.getReader?.();
    const decoder = new TextDecoder();
    let buffer = "";
    let partialRead = "";

    while (true) {
      const { done, value } = (await reader?.read?.()) ?? { done: true, value: undefined };
      if (done) break;
      partialRead += decoder?.decode?.(value, { stream: true });
      let lines = partialRead?.split?.('\n');
      partialRead = lines?.pop?.() ?? "";
      for (const line of lines ?? []) {
        if (line?.startsWith?.("data: ")) {
          const data = line?.slice?.(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            buffer += parsed?.choices?.[0]?.delta?.content ?? "";
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log("🏥 [DISCHARGE-PLANNER] Parsed buffer:", buffer);

    let parsedCriteria: ParsedCriteria = {};
    try {
      parsedCriteria = JSON.parse(buffer);
    } catch (e) {
      console.error("🏥 [DISCHARGE-PLANNER] ❌ Failed to parse criteria JSON", e);
      // Continue with empty criteria
    }

    console.log("🏥 [DISCHARGE-PLANNER] ✅ Parsed criteria:", parsedCriteria);

    // Stage 2: Query database for matching homes
    console.log("🏥 [DISCHARGE-PLANNER] Stage 2: Querying homes...");

    // Build Prisma where clause based on parsed criteria
    const whereClause: any = {
      status: "ACTIVE",
    };

    // Filter by care level
    if (parsedCriteria?.careLevel && parsedCriteria.careLevel?.length > 0) {
      whereClause.careLevel = {
        hasSome: parsedCriteria.careLevel,
      };
    }

    // Filter by location (city or state)
    if (parsedCriteria?.location) {
      whereClause.address = {
        OR: [
          { city: { contains: parsedCriteria.location, mode: "insensitive" } },
          { state: { contains: parsedCriteria.location, mode: "insensitive" } },
        ],
      };
    }

    // Filter by gender restriction
    if (parsedCriteria?.gender && parsedCriteria.gender !== "Any") {
      whereClause.OR = [
        { genderRestriction: null },
        { genderRestriction: parsedCriteria.gender },
      ];
    }

    // Query homes with optimized field selection to reduce memory usage
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
          select: {
            url: true,
          },
          take: 1,
        },
        operator: {
          select: {
            companyName: true,
            user: {
              select: {
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      take: 20, // Get top 20 candidates for AI scoring
    });

    console.log("🏥 [DISCHARGE-PLANNER] Found ${homes?.length ?? 0} candidate homes");

    if (!homes || homes.length === 0) {
      // No homes found, return empty results
      await prisma.placementSearch.update({
        where: { id: searchRecord.id },
        data: {
          parsedCriteria,
          searchResults: { homes: [] },
          status: "COMPLETED",
        },
      });

      return NextResponse?.json?.(
        {
          searchId: searchRecord.id,
          query: query,
          totalMatches: 0,
          matches: [],
          message: "No matching homes found. Try broadening your search criteria.",
        },
        { status: 200 }
      );
    }

    // Stage 3: Use AI to score and rank homes
    console.log("🏥 [DISCHARGE-PLANNER] Stage 3: AI scoring homes...");

    const homesData = homes?.map?.((h) => ({
      id: h?.id,
      name: h?.name,
      description: h?.description,
      careLevel: h?.careLevel,
      amenities: h?.amenities,
      capacity: h?.capacity,
      currentOccupancy: h?.currentOccupancy,
      availableBeds: h?.capacity - h?.currentOccupancy,
      priceRange: `$${h?.priceMin ?? 0}-$${h?.priceMax ?? 0}/month`,
      location: `${h?.address?.city ?? ""}, ${h?.address?.state ?? ""}`,
      genderRestriction: h?.genderRestriction ?? "Any",
    }));

    const scoringPrompt = `You are a senior care placement expert. Score and rank these homes for the following request:

REQUEST: "${query}"

PARSED CRITERIA:
${JSON.stringify(parsedCriteria, null, 2)}

AVAILABLE HOMES:
${JSON.stringify(homesData, null, 2)}

For each home, provide:
1. A match score from 1-100
2. Brief reasoning (2-3 sentences max)
3. Confidence level (HIGH, MEDIUM, or LOW)

Return the top 5 best matches in JSON format:
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

Consider:
- Timeline urgency and bed availability
- Care level match
- Payment type compatibility
- Location proximity
- Amenities matching preferences
- Overall fit

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;

    const scoringResponse = await fetch("https://apps.abacus.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON?.stringify?.({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "You are a senior care placement expert. Score homes accurately based on criteria match." },
          { role: "user", content: scoringPrompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.5,
      }),
    });

    if (!scoringResponse?.ok) {
      console.error("🏥 [DISCHARGE-PLANNER] ❌ Scoring API error:", scoringResponse?.status);
      throw new Error("Failed to score homes");
    }

    // Stream and buffer the scoring response
    const scoringReader = scoringResponse?.body?.getReader?.();
    let scoringBuffer = "";
    let scoringPartialRead = "";

    while (true) {
      const { done, value } = (await scoringReader?.read?.()) ?? { done: true, value: undefined };
      if (done) break;
      scoringPartialRead += decoder?.decode?.(value, { stream: true });
      let lines = scoringPartialRead?.split?.('\n');
      scoringPartialRead = lines?.pop?.() ?? "";
      for (const line of lines ?? []) {
        if (line?.startsWith?.("data: ")) {
          const data = line?.slice?.(6);
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            scoringBuffer += parsed?.choices?.[0]?.delta?.content ?? "";
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }

    console.log("🏥 [DISCHARGE-PLANNER] Scoring buffer:", scoringBuffer);

    let scoringResults: { matches: any[] } = { matches: [] };
    try {
      scoringResults = JSON.parse(scoringBuffer);
    } catch (e) {
      console.error("🏥 [DISCHARGE-PLANNER] ❌ Failed to parse scoring JSON", e);
      // Return homes without AI scoring
      scoringResults = {
        matches: homes?.slice?.(0, 5)?.map?.((h) => ({
          homeId: h?.id,
          score: 70,
          reasoning: "Match based on basic criteria filtering",
          confidence: "MEDIUM",
        })) ?? [],
      };
    }

    console.log("🏥 [DISCHARGE-PLANNER] ✅ Scoring results:", scoringResults);

    // Build final matches with home details
    const matches = (scoringResults?.matches ?? [])?.map?.((match: any) => {
      const home = homes?.find?.((h) => h?.id === match?.homeId);
      if (!home) return null;

      // Format address as string
      const addressString = home?.address
        ? `${home.address.street}, ${home.address.city}, ${home.address.state} ${home.address.zipCode}`
        : "Address not available";

      // Calculate available beds
      const availableBeds = home.capacity - home.currentOccupancy;

      // Get contact info from operator
      const contactEmail = home?.operator?.user?.email ?? undefined;
      const contactPhone = home?.operator?.user?.phone ?? undefined;

      return {
        homeId: home.id,  // Changed from 'id' to 'homeId'
        homeName: home.name,  // Changed from 'name' to 'homeName'
        address: addressString,  // Changed from object to string
        score: match?.score ?? 0,
        reasoning: match?.reasoning ?? "Good match",
        careTypes: home.careLevel,  // Changed from 'careLevel' to 'careTypes'
        availableBeds,  // Added calculated field
        startingPrice: parseFloat(home?.priceMin?.toString?.() ?? "0"),  // Changed from 'priceMin' to 'startingPrice'
        amenities: home.amenities,
        contactEmail,  // Added contact info
        contactPhone,  // Added contact info
      };
    })?.filter?.((m) => m !== null) ?? [];

    // Update search record with results
    await prisma.placementSearch.update({
      where: { id: searchRecord.id },
      data: {
        parsedCriteria,
        searchResults: { matches },
        status: "COMPLETED",
      },
    });

    console.log("🏥 [DISCHARGE-PLANNER] ✅ Search completed with ${matches?.length ?? 0} matches");

    return NextResponse?.json?.(
      {
        searchId: searchRecord.id,
        query: query,  // Added query field
        totalMatches: matches.length,  // Added totalMatches field
        matches,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("🏥 [DISCHARGE-PLANNER] ❌ Error:", error);
    
    // Capture error in Sentry for monitoring
    captureError(error as Error, {
      tags: {
        api: 'discharge-planner-search',
        endpoint: '/api/discharge-planner/search',
      },
      extra: {
        method: request.method,
      },
    });
    
    return NextResponse?.json?.(
      { error: error?.message ?? "Failed to process search request" },
      { status: 500 }
    );
  }
}
