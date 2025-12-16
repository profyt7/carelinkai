import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { AuditAction } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

// Validation schema for match request
const matchRequestSchema = z.object({
  budgetMin: z.number().positive(),
  budgetMax: z.number().positive(),
  medicalConditions: z.array(z.string()).default([]),
  careLevel: z.enum(['INDEPENDENT_LIVING', 'ASSISTED_LIVING', 'MEMORY_CARE', 'SKILLED_NURSING']),
  preferredGender: z.enum(['MALE', 'FEMALE', 'NO_PREFERENCE']).optional(),
  religion: z.string().optional(),
  dietaryNeeds: z.array(z.string()).default([]),
  hobbies: z.array(z.string()).default([]),
  petPreferences: z.enum(['HAS_PETS', 'PET_FRIENDLY', 'NO_PETS']).optional(),
  zipCode: z.string().min(5).max(10),
  maxDistance: z.number().positive().max(100),
  moveInTimeline: z.enum(['IMMEDIATE', '1_3_MONTHS', '3_6_MONTHS', 'EXPLORING'])
});

/**
 * POST /api/family/match
 * Submit preferences and get matching homes
 */
export async function POST(request: NextRequest) {
  console.log('[POST /api/family/match] Starting match request...');
  
  try {
    // Authentication required
    console.log('[POST /api/family/match] Step 1: Authenticating user...');
    const user = await requireAuth();
    console.log('[POST /api/family/match] User authenticated:', user.id);
    
    // Parse and validate request body
    console.log('[POST /api/family/match] Step 2: Parsing request body...');
    const body = await request.json();
    console.log('[POST /api/family/match] Request body:', JSON.stringify(body, null, 2));
    
    console.log('[POST /api/family/match] Step 3: Validating data...');
    const validatedData = matchRequestSchema.parse(body);
    console.log('[POST /api/family/match] Data validated successfully');
    
    // Get family record
    console.log('[POST /api/family/match] Step 4: Fetching family record...');
    const family = await prisma.family.findUnique({
      where: { userId: user.id }
    });
    
    if (!family) {
      console.error('[POST /api/family/match] Family profile not found for user:', user.id);
      return NextResponse.json(
        { error: 'Family profile not found' },
        { status: 404 }
      );
    }
    console.log('[POST /api/family/match] Family found:', family.id);
    
    // Create match request
    console.log('[POST /api/family/match] Step 5: Creating match request...');
    const matchRequest = await prisma.matchRequest.create({
      data: {
        familyId: family.id,
        status: 'PENDING',
        budgetMin: validatedData.budgetMin,
        budgetMax: validatedData.budgetMax,
        medicalConditions: validatedData.medicalConditions,
        careLevel: validatedData.careLevel,
        preferredGender: validatedData.preferredGender,
        religion: validatedData.religion,
        dietaryNeeds: validatedData.dietaryNeeds,
        hobbies: validatedData.hobbies,
        petPreferences: validatedData.petPreferences,
        zipCode: validatedData.zipCode,
        maxDistance: validatedData.maxDistance,
        moveInTimeline: validatedData.moveInTimeline
      }
    });
    console.log('[POST /api/family/match] Match request created:', matchRequest.id);
    
    // Run matching algorithm
    console.log('[POST /api/family/match] Step 6: Running matching algorithm...');
    const { findMatchingHomes } = await import('@/lib/matching/matching-algorithm');
    
    const matchedHomes = await findMatchingHomes({
      budgetMin: Number(validatedData.budgetMin),
      budgetMax: Number(validatedData.budgetMax),
      medicalConditions: validatedData.medicalConditions,
      careLevel: validatedData.careLevel,
      preferredGender: validatedData.preferredGender,
      religion: validatedData.religion,
      dietaryNeeds: validatedData.dietaryNeeds,
      hobbies: validatedData.hobbies,
      petPreferences: validatedData.petPreferences,
      zipCode: validatedData.zipCode,
      maxDistance: validatedData.maxDistance,
      moveInTimeline: validatedData.moveInTimeline
    }, 5); // Top 5 matches
    console.log('[POST /api/family/match] Matching complete. Found', matchedHomes.length, 'homes');
    
    // If no homes found, update status and return early
    if (matchedHomes.length === 0) {
      console.log('[POST /api/family/match] No matching homes found');
      await prisma.matchRequest.update({
        where: { id: matchRequest.id },
        data: { status: 'COMPLETED' }
      });
      
      return NextResponse.json({
        success: true,
        matchRequestId: matchRequest.id,
        matchesFound: 0,
        topMatches: 0,
        message: 'No matching homes found. Please adjust your preferences and try again.'
      }, { status: 200 });
    }
    
    // Generate AI explanations for matches
    console.log('[POST /api/family/match] Step 7: Generating AI explanations...');
    const { generateBatchExplanations } = await import('@/lib/matching/openai-explainer');
    
    const explanationData = matchedHomes.map(match => ({
      homeName: match.home.name,
      fitScore: match.fitScore,
      matchFactors: match.matchFactors,
      homeDetails: {
        careLevel: match.home.careLevel,
        priceRange: match.home.priceMin && match.home.priceMax 
          ? `$${match.home.priceMin}-$${match.home.priceMax}`
          : 'Contact for pricing',
        location: match.home.address?.city && match.home.address?.state
          ? `${match.home.address.city}, ${match.home.address.state}`
          : 'Location available',
        amenities: match.home.amenities,
        capacity: match.home.capacity,
        currentOccupancy: match.home.currentOccupancy
      },
      familyPreferences: {
        budgetRange: `$${validatedData.budgetMin}-$${validatedData.budgetMax}`,
        careLevel: validatedData.careLevel,
        medicalConditions: validatedData.medicalConditions,
        location: validatedData.zipCode,
        preferences: [
          ...validatedData.dietaryNeeds,
          ...validatedData.hobbies,
          validatedData.religion || '',
          validatedData.petPreferences || ''
        ].filter(Boolean)
      }
    }));
    
    // Generate explanations (with fallback if OpenAI fails)
    console.log('[POST /api/family/match] Calling generateBatchExplanations...');
    const explanations = await generateBatchExplanations(explanationData);
    console.log('[POST /api/family/match] Explanations generated:', explanations.size);
    
    // Store match results in database with explanations
    console.log('[POST /api/family/match] Step 8: Storing match results...');
    const matchResults = await Promise.all(
      matchedHomes.map(async (match, index) => {
        // Validate fitScore is a valid number
        const fitScore = isFinite(match.fitScore) ? match.fitScore : 0;
        
        // Ensure matchFactors is a plain object with valid numbers
        const matchFactors = {
          budgetScore: isFinite(match.matchFactors.budgetScore) ? match.matchFactors.budgetScore : 0,
          conditionScore: isFinite(match.matchFactors.conditionScore) ? match.matchFactors.conditionScore : 0,
          careLevelScore: isFinite(match.matchFactors.careLevelScore) ? match.matchFactors.careLevelScore : 0,
          locationScore: isFinite(match.matchFactors.locationScore) ? match.matchFactors.locationScore : 0,
          amenitiesScore: isFinite(match.matchFactors.amenitiesScore) ? match.matchFactors.amenitiesScore : 0
        };
        
        // Get explanation with multiple fallbacks
        const homeName = match.home?.name || 'Unknown Home';
        const explanation = explanations.get(homeName) || 
          `This home is a ${Math.round(fitScore)}% match for your needs based on care level, budget, and location.`;
        
        console.log(`[POST /api/family/match] Creating match result ${index + 1}:`, {
          homeId: match.homeId,
          homeName,
          fitScore,
          rank: index + 1
        });
        
        try {
          return await prisma.matchResult.create({
            data: {
              matchRequestId: matchRequest.id,
              homeId: match.homeId,
              fitScore,
              matchFactors,
              explanation,
              rank: index + 1
            }
          });
        } catch (error) {
          console.error(`[POST /api/family/match] Error creating match result for home ${match.homeId}:`, error);
          throw error;
        }
      })
    );
    console.log('[POST /api/family/match] Match results stored:', matchResults.length);
    
    // Update match request status to COMPLETED
    console.log('[POST /api/family/match] Step 9: Updating match request status...');
    await prisma.matchRequest.update({
      where: { id: matchRequest.id },
      data: { status: 'COMPLETED' }
    });
    console.log('[POST /api/family/match] Match request updated to COMPLETED');
    
    // Create audit log
    console.log('[POST /api/family/match] Step 10: Creating audit log...');
    await createAuditLogFromRequest(request, {
      userId: user.id,
      action: AuditAction.CREATE,
      resourceType: 'match_request',
      resourceId: matchRequest.id,
      details: {
        careLevel: validatedData.careLevel,
        budgetRange: `${validatedData.budgetMin}-${validatedData.budgetMax}`,
        zipCode: validatedData.zipCode,
        matchesFound: matchedHomes.length,
        topScore: matchedHomes[0]?.fitScore || 0
      }
    });
    console.log('[POST /api/family/match] Audit log created');
    
    console.log('[POST /api/family/match] SUCCESS - Returning results');
    return NextResponse.json({
      success: true,
      matchRequestId: matchRequest.id,
      matchesFound: matchedHomes.length,
      topMatches: matchResults.length,
      message: 'Match request completed successfully!'
    }, { status: 201 });
    
  } catch (error) {
    console.error('[POST /api/family/match] ERROR OCCURRED:');
    console.error('[POST /api/family/match] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[POST /api/family/match] Error message:', error instanceof Error ? error.message : String(error));
    console.error('[POST /api/family/match] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('[POST /api/family/match] Full error:', error);
    
    if (error instanceof z.ZodError) {
      console.error('[POST /api/family/match] Zod validation error:', JSON.stringify(error.errors, null, 2));
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    // Return more detailed error in development
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/family/match
 * Get all match requests for the authenticated family
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication required
    const user = await requireAuth();
    
    // Get family record
    const family = await prisma.family.findUnique({
      where: { userId: user.id }
    });
    
    if (!family) {
      return NextResponse.json(
        { error: 'Family profile not found' },
        { status: 404 }
      );
    }
    
    // Get all match requests for this family
    const matchRequests = await prisma.matchRequest.findMany({
      where: { familyId: family.id },
      include: {
        results: {
          include: {
            home: {
              include: {
                address: true,
                photos: {
                  where: { isPrimary: true },
                  take: 1
                }
              }
            }
          },
          orderBy: { rank: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      matchRequests
    });
    
  } catch (error) {
    console.error('[GET /api/family/match] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
