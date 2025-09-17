import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering to avoid static optimization
export const dynamic = "force-dynamic";

/**
 * GET /api/timesheets
 * 
 * Returns timesheets for the authenticated user based on their role:
 * - Caregivers: see their own timesheets
 * - Operators: see timesheets for shifts in their homes
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
    let timesheets: any[] = [];

    // Check if user is a caregiver
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (caregiver) {
      // User is a caregiver, return their timesheets
      timesheets = await prisma.timesheet.findMany({
        where: {
          caregiverId: caregiver.id
        },
        include: {
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
        // User is an operator, return timesheets for shifts in their homes
        timesheets = await prisma.timesheet.findMany({
          where: {
            shift: {
              home: {
                operatorId: operator.id
              }
            }
          },
          include: {
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
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      // If user is neither caregiver nor operator, timesheets remains an empty array
    }

    // Return the timesheets
    return NextResponse.json({ timesheets });

  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch timesheets" },
      { status: 500 }
    );
  }
}
