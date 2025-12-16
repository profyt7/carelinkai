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
    
    return NextResponse.json({
      success: true,
      matchRequest
    });
    
  } catch (error) {
    console.error('[GET /api/family/match/[id]] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
