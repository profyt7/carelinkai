import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient, UserRole, InquiryStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || (user.role !== UserRole.OPERATOR && user.role !== UserRole.ADMIN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as InquiryStatus | null;
    const homeId = searchParams.get('homeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause
    let operator = null;
    if (user.role === UserRole.OPERATOR) {
      operator = await prisma.operator.findUnique({
        where: { userId: user.id },
      });
      if (!operator) {
        return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
      }
    }

    const where: any = {};

    // Filter by operator's homes
    if (operator) {
      where.home = { operatorId: operator.id };
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by home
    if (homeId) {
      where.homeId = homeId;
    }

    // Filter by date range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build order by
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Fetch inquiries with pagination
    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        include: {
          home: {
            select: { id: true, name: true },
          },
          family: {
            select: { id: true, name: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.inquiry.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      inquiries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching inquiries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
