export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkFamilyMembership } from "@/lib/services/family";

/**
 * GET /api/billing/payments
 * 
 * Retrieves payment history for a user or family
 * Requires authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const providedFamilyId = searchParams.get("familyId");

    // If no familyId provided, simply return the user's payments
    if (!providedFamilyId) {
      const payments = await prisma.payment.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          booking: {
            select: {
              id: true,
              moveInDate: true,
              status: true,
              resident: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              },
              home: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      return NextResponse.json({ payments });
    }

    // Check if user is a member of the family
    const isMember = await checkFamilyMembership(
      session.user.id,
      providedFamilyId
    );
    
    if (!isMember) {
      return NextResponse.json(
        { error: "Not a member of this family" },
        { status: 403 }
      );
    }

    // Get family members to find the owner
    const familyMembers = await prisma.familyMember.findMany({
      where: { 
        familyId: providedFamilyId,
      },
      include: {
        user: {
          select: {
            id: true
          }
        }
      }
    });

    // Get all resident IDs for this family
    const family = await prisma.family.findUnique({
      where: { id: providedFamilyId },
      include: {
        residents: {
          select: { id: true }
        }
      }
    });

    if (!family) {
      return NextResponse.json(
        { error: "Family not found" },
        { status: 404 }
      );
    }

    // Get all bookings for these residents
    const residentIds = family.residents.map(r => r.id);
    
    // Query payments that are either:
    // 1. Made by the session user
    // 2. Associated with bookings for any of the family's residents
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          { userId: session.user.id },
          {
            booking: {
              residentId: {
                in: residentIds
              }
            }
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        booking: {
          select: {
            id: true,
            moveInDate: true,
            status: true,
            resident: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            home: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ payments });

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
