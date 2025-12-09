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
      prisma.inquiry.count({
        where: Object.keys(homeFilter).length ? { home: homeFilter } : {},
      }),
      prisma.resident.count({
        where: Object.keys(homeFilter).length
          ? { home: homeFilter, status: "ACTIVE" }
          : { status: "ACTIVE" },
      }),
      // Recent activity: last 5 inquiries
      prisma.inquiry.findMany({
        where: Object.keys(homeFilter).length ? { home: homeFilter } : {},
        include: {
          home: { select: { name: true } },
          family: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      // Expiring licenses (within 30 days)
      prisma.homeLicense.findMany({
        where: {
          home: homeFilter,
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
        where: Object.keys(homeFilter).length
          ? { home: homeFilter, status: "NEW" }
          : { status: "NEW" },
      }),
    ]);

    // Calculate occupancy rate
    const capacityAgg = await prisma.assistedLivingHome
      .groupBy({
        by: ["operatorId"],
        where: homeFilter,
        _sum: { capacity: true, currentOccupancy: true },
      })
      .catch(() => [] as any[]);

    const totals = capacityAgg[0]?._sum || { capacity: 0, currentOccupancy: 0 };
    const occupancyRate = totals.capacity
      ? Math.round(
          ((Number(totals.currentOccupancy || 0) / Number(totals.capacity)) *
            100)
        )
      : 0;

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
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
