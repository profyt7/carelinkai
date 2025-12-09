import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Only admins can fetch all operators
    if (user.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // If not detailed, return simple list (for dropdown/selector)
    if (!detailed) {
      const operators = await prisma.operator.findMany({
        orderBy: { companyName: "asc" },
        select: { id: true, companyName: true },
      });

      return NextResponse.json(operators);
    }

    // Build where clause for search
    const where = q.trim()
      ? {
          OR: [
            { companyName: { contains: q.trim(), mode: "insensitive" as const } },
            { user: { email: { contains: q.trim(), mode: "insensitive" as const } } },
            { user: { firstName: { contains: q.trim(), mode: "insensitive" as const } } },
            { user: { lastName: { contains: q.trim(), mode: "insensitive" as const } } },
          ],
        }
      : {};

    // Fetch operators with details
    const [operators, total] = await Promise.all([
      prisma.operator.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          homes: {
            select: {
              id: true,
            },
          },
          _count: {
            select: {
              homes: true,
              caregivers: true,
            },
          },
        },
        orderBy: { companyName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.operator.count({ where }),
    ]);

    // Get additional stats for each operator
    const operatorsWithStats = await Promise.all(
      operators.map(async (op) => {
        const homeIds = op.homes.map((h) => h.id);
        
        const [inquiries, residents] = await Promise.all([
          prisma.inquiry.count({
            where: homeIds.length > 0 ? { homeId: { in: homeIds } } : { homeId: "none" },
          }),
          prisma.resident.count({
            where: homeIds.length > 0 ? { homeId: { in: homeIds }, status: "ACTIVE" } : { homeId: "none" },
          }),
        ]);

        return {
          id: op.id,
          userId: op.userId,
          companyName: op.companyName,
          userName: `${op.user.firstName} ${op.user.lastName}`,
          email: op.user.email,
          homesCount: op._count.homes,
          caregiversCount: op._count.caregivers,
          inquiriesCount: inquiries,
          residentsCount: residents,
          createdAt: op.createdAt.toISOString(),
        };
      })
    );

    const response = {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      items: operatorsWithStats,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[API /api/operators] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
