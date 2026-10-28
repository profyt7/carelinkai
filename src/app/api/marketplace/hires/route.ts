import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * GET /api/marketplace/hires
 * 
 * Returns marketplace hires for the authenticated user based on their role:
 * - Caregivers: see hires where they are the caregiver
 * - Operators: see hires for shifts in their homes or listings they posted
 * 
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    // Explicit type to satisfy TypeScript
    let hires: any[] = [];

    // Check if user is a caregiver
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (caregiver) {
      // User is a caregiver, return their hires
      hires = await prisma.marketplaceHire.findMany({
        where: {
          caregiverId: caregiver.id
        },
        include: {
          listing: {
            select: {
              id: true,
              title: true
            }
          },
          shift: {
            select: {
              id: true,
              startTime: true,
              endTime: true,
              home: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          payment: {
            select: {
              id: true,
              status: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Check if user is an operator
      const operator = await prisma.operator.findUnique({
        where: { userId },
        select: { id: true }
      });

      if (operator) {
        // User is an operator, return hires for their homes or listings
        hires = await prisma.marketplaceHire.findMany({
          where: {
            OR: [
              // Hires for shifts in homes operated by this operator
              {
                shift: {
                  home: {
                    operatorId: operator.id
                  }
                }
              },
              // Hires for listings posted by this user
              {
                listing: {
                  postedByUserId: userId
                }
              }
            ]
          },
          include: {
            listing: {
              select: {
                id: true,
                title: true
              }
            },
            shift: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                home: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            },
            payment: {
              select: {
                id: true,
                status: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      // If user is neither caregiver nor operator, hires remains an empty array
    }

    // Return the hires
    return NextResponse.json({ hires });

  } catch (error) {
    console.error("Error fetching marketplace hires:", error);
    return NextResponse.json(
      { error: "Failed to fetch marketplace hires" },
      { status: 500 }
    );
  }
}
