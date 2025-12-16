import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth-utils';

/**
 * GET /api/family/match/[id]
 * Get a specific match request with results
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
    
    // Get match request with results
    const matchRequest = await prisma.matchRequest.findFirst({
      where: {
        id: params.id,
        familyId: family.id // Ensure user owns this match request
      },
      include: {
        results: {
          include: {
            home: {
              include: {
                address: true,
                photos: {
                  where: { isPrimary: true },
                  take: 1
                },
                operator: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true
                      }
                    }
                  }
                },
                reviews: {
                  take: 5,
                  orderBy: { createdAt: 'desc' }
                }
              }
            }
          },
          orderBy: { rank: 'asc' }
        },
        feedback: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });
    
    if (!matchRequest) {
      return NextResponse.json(
        { error: 'Match request not found' },
        { status: 404 }
      );
    }
    
    // Transform results to ensure numeric types
    const transformedMatchRequest = {
      ...matchRequest,
      results: matchRequest.results.map(result => {
        // Convert fitScore from Decimal/string to number and ensure valid range (0-100)
        const fitScore = Math.max(0, Math.min(100, Number(result.fitScore) || 0));
        
        return {
          ...result,
          fitScore,
          // Ensure rank is a number
          rank: Number(result.rank) || 0,
          // Ensure all matchFactors scores are numbers
          matchFactors: typeof result.matchFactors === 'object' && result.matchFactors !== null
            ? {
                budgetScore: Number((result.matchFactors as any).budgetScore) || 0,
                locationScore: Number((result.matchFactors as any).locationScore) || 0,
                amenitiesScore: Number((result.matchFactors as any).amenitiesScore) || 0,
                careLevelScore: Number((result.matchFactors as any).careLevelScore) || 0,
                conditionScore: Number((result.matchFactors as any).conditionScore) || 0
              }
            : result.matchFactors
        };
      })
    };
    
    return NextResponse.json({
      success: true,
      matchRequest: transformedMatchRequest
    });
    
  } catch (error) {
    console.error('[GET /api/family/match/[id]] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
