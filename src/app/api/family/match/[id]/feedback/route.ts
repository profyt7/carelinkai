
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';
import { AuditAction, FeedbackType } from '@prisma/client';
import { createAuditLogFromRequest } from '@/lib/audit';

// Validation schema for feedback
const feedbackSchema = z.object({
  homeId: z.string(),
  feedbackType: z.nativeEnum(FeedbackType),
  notes: z.string().optional()
});

/**
 * POST /api/family/match/[id]/feedback
 * Submit feedback on a match result
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication required
    const user = await requireAuth();
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = feedbackSchema.parse(body);
    
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
    
    // Verify match request exists and belongs to this family
    const matchRequest = await prisma.matchRequest.findFirst({
      where: {
        id: params.id,
        familyId: family.id
      }
    });
    
    if (!matchRequest) {
      return NextResponse.json(
        { error: 'Match request not found' },
        { status: 404 }
      );
    }
    
    // Verify home exists in match results
    const matchResult = await prisma.matchResult.findFirst({
      where: {
        matchRequestId: params.id,
        homeId: validatedData.homeId
      }
    });
    
    if (!matchResult) {
      return NextResponse.json(
        { error: 'Home not found in match results' },
        { status: 404 }
      );
    }
    
    // Check if feedback already exists
    const existingFeedback = await prisma.matchFeedback.findFirst({
      where: {
        matchRequestId: params.id,
        homeId: validatedData.homeId,
        userId: user.id,
        feedbackType: validatedData.feedbackType
      }
    });
    
    if (existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback already submitted' },
        { status: 409 }
      );
    }
    
    // Create feedback
    const feedback = await prisma.matchFeedback.create({
      data: {
        matchRequestId: params.id,
        homeId: validatedData.homeId,
        userId: user.id,
        feedbackType: validatedData.feedbackType,
        notes: validatedData.notes
      },
      include: {
        home: {
          select: {
            name: true
          }
        }
      }
    });
    
    // Create audit log
    await createAuditLogFromRequest(

      request,

      AuditAction.CREATE,

      'match_feedback',

      feedback.id,

      'Created match_feedback',

      {
        matchRequestId: params.id,
        homeId: validatedData.homeId,
        feedbackType: validatedData.feedbackType
      }

    );
    
    return NextResponse.json({
      success: true,
      feedback
    }, { status: 201 });
    
  } catch (error) {
    console.error('[POST /api/family/match/[id]/feedback] Error:', error);
    
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
 * GET /api/family/match/[id]/feedback
 * Get all feedback for a match request
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    
    // Verify match request exists and belongs to this family
    const matchRequest = await prisma.matchRequest.findFirst({
      where: {
        id: params.id,
        familyId: family.id
      }
    });
    
    if (!matchRequest) {
      return NextResponse.json(
        { error: 'Match request not found' },
        { status: 404 }
      );
    }
    
    // Get all feedback for this match request
    const feedback = await prisma.matchFeedback.findMany({
      where: {
        matchRequestId: params.id
      },
      include: {
        home: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json({
      success: true,
      feedback
    });
    
  } catch (error) {
    console.error('[GET /api/family/match/[id]/feedback] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
