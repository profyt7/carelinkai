import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const operatorIdParam = searchParams.get('operatorId');

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Resolve operator (if user is OPERATOR). Admins may view global summary.
    const operator = user.role === UserRole.OPERATOR
      ? await prisma.operator.findUnique({ where: { userId: user.id } })
      : null;

    // Determine homeFilter based on user role and query params
    const homeFilter = operatorIdParam && user.role === UserRole.ADMIN
      ? { operatorId: operatorIdParam }
      : operator
        ? { operatorId: operator.id }
        : {};

    // For queries that need homeIds, we fetch them first
    let homeIds: string[] | undefined;
    if (Object.keys(homeFilter).length > 0) {
      const operatorHomes = await prisma.assistedLivingHome.findMany({
        where: homeFilter,
        select: { id: true },
      });
      homeIds = operatorHomes.map(h => h.id);
    }

    // Construct filters for related models
    const inquiryFilter = homeIds ? { homeId: { in: homeIds } } : {};
    const residentFilter = homeIds ? { homeId: { in: homeIds } } : {};
    const licenseFilter = homeIds ? { homeId: { in: homeIds } } : {};

    // Fetch all dashboard data in parallel
    const [
      homes,
      inquiries,
      activeResidents,
      recentInquiries,
      expiringLicenses,
      newInquiriesCount,
    ] = await Promise.all([
      prisma.assistedLivingHome.count({ where: homeFilter }),
      prisma.inquiry.count({ where: inquiryFilter }),
      prisma.resident.count({
        where: { ...residentFilter, status: "ACTIVE" },
      }),
      // Recent activity: last 5 inquiries
      prisma.inquiry.findMany({
        where: inquiryFilter,
        include: {
          home: { select: { name: true } },
          family: { select: { primaryContactName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Expiring licenses (within 30 days)
      prisma.license.findMany({
        where: {
          ...licenseFilter,
          expirationDate: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
        include: {
          home: { select: { name: true } },
        },
        orderBy: { expirationDate: "asc" },
        take: 5,
      }),
      // New inquiries count (status = NEW)
      prisma.inquiry.count({
        where: { ...inquiryFilter, status: "NEW" },
      }),
    ]);

    // Calculate occupancy rate
    let occupancyRate = 0;
    try {
      const capacityAgg = await prisma.assistedLivingHome.aggregate({
        where: homeFilter,
        _sum: { capacity: true, currentOccupancy: true },
      });
      
      const totalCapacity = Number(capacityAgg._sum.capacity || 0);
      const totalOccupancy = Number(capacityAgg._sum.currentOccupancy || 0);
      
      if (totalCapacity > 0) {
        occupancyRate = Math.round((totalOccupancy / totalCapacity) * 100);
      }
    } catch (aggError) {
      console.error("[API /api/operator/dashboard] Occupancy calculation error:", aggError);
      // Continue with occupancyRate = 0
    }

    const summary = {
      homes,
      inquiries,
      activeResidents,
      occupancyRate,
      recentInquiries,
      expiringLicenses,
      newInquiriesCount,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[API /api/operator/dashboard] Error:", error);
    console.error("[API /api/operator/dashboard] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    // Log more context for debugging
    const session = await getServerSession(authOptions).catch(() => null);
    console.error("[API /api/operator/dashboard] Session:", session?.user?.email || "No session");
    
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
