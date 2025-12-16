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
  try {
    // Authentication required
    const user = await requireAuth();
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = matchRequestSchema.parse(body);
    
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
    
    // Create match request
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
    
    // Create audit log
    await createAuditLogFromRequest(request, {
      userId: user.id,
      action: AuditAction.CREATE,
      resourceType: 'match_request',
      resourceId: matchRequest.id,
      details: {
        careLevel: validatedData.careLevel,
        budgetRange: `${validatedData.budgetMin}-${validatedData.budgetMax}`,
        zipCode: validatedData.zipCode
      }
    });
    
    // TODO: Phase 2 - Run matching algorithm
    // For now, we'll just return the match request ID
    // The actual matching will be implemented in Phase 2
    
    return NextResponse.json({
      success: true,
      matchRequestId: matchRequest.id,
      message: 'Match request created successfully. Matching algorithm will be implemented in Phase 2.'
    }, { status: 201 });
    
  } catch (error) {
    console.error('[POST /api/family/match] Error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
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
