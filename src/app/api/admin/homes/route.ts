import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HomeStatus, CareLevel } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('[Homes API] GET request received');
  try {
    const session = await getServerSession(authOptions);
    console.log('[Homes API] Session:', session ? `User: ${session.user?.email}, Role: ${session.user?.role}` : 'No session');

    // Check if user is admin
    if (!session || session.user?.role !== 'ADMIN') {
      console.log('[Homes API] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    console.log('[Homes API] Query params:', Object.fromEntries(searchParams.entries()));
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const careLevel = searchParams.get('careLevel');
    const minOccupancy = searchParams.get('minOccupancy');
    const maxOccupancy = searchParams.get('maxOccupancy');
    const exportData = searchParams.get('export') === 'true';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // Search by name, description, or operator name
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { operator: { companyName: { contains: search, mode: 'insensitive' } } },
        { address: { city: { contains: search, mode: 'insensitive' } } },
        { address: { state: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by status
    if (status && status !== 'ALL') {
      where.status = status as HomeStatus;
    }

    // Filter by care level
    if (careLevel && careLevel !== 'ALL') {
      where.careLevel = {
        has: careLevel as CareLevel,
      };
    }

    // Filter by occupancy percentage
    if (minOccupancy || maxOccupancy) {
      // This requires a more complex query since we need to calculate occupancy percentage
      // We'll handle this in the frontend filtering for now
    }

    // Get total count for pagination
    const totalCount = await prisma.assistedLivingHome.count({ where }).catch((error) => {
      console.error('[Homes API] Count error:', error);
      throw new Error(`Database count failed: ${error.message}`);
    });

    console.log(`[Homes API] Found ${totalCount} homes matching filters`);

    // For export, get all records without pagination
    const homesQuery = exportData
      ? prisma.assistedLivingHome.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            operator: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
            address: true,
            licenses: {
              select: {
                id: true,
                licenseNumber: true,
                licenseType: true,
                status: true,
                expiryDate: true,
              },
            },
            residents: {
              select: { id: true, status: true },
            },
            reviews: {
              select: { id: true, rating: true },
            },
            photos: {
              select: { id: true, isPrimary: true },
            },
          },
        })
      : prisma.assistedLivingHome.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            operator: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                  },
                },
              },
            },
            address: true,
            licenses: {
              select: {
                id: true,
                licenseNumber: true,
                licenseType: true,
                status: true,
                expiryDate: true,
              },
            },
            residents: {
              select: { id: true, status: true },
            },
            reviews: {
              select: { id: true, rating: true },
            },
            photos: {
              select: { id: true, isPrimary: true },
            },
          },
        });

    const homes = await homesQuery.catch((error) => {
      console.error('[Homes API] Query error:', error);
      throw new Error(`Database query failed: ${error.message}`);
    });

    console.log(`[Homes API] Successfully fetched ${homes.length} homes`);

    // Calculate additional metrics for each home
    const homesWithMetrics = homes.map((home) => {
      try {
        const occupancyRate = home.capacity > 0 
          ? ((home.currentOccupancy / home.capacity) * 100).toFixed(1)
          : '0';
        
        const activeResidents = home.residents?.filter(r => r.status === 'ACTIVE').length || 0;
        
        const averageRating = home.reviews && home.reviews.length > 0
          ? (home.reviews.reduce((sum, r) => sum + r.rating, 0) / home.reviews.length).toFixed(1)
          : null;
        
        const activeLicenses = home.licenses?.filter(l => l.status === 'ACTIVE').length || 0;
        const expiringLicenses = home.licenses?.filter(l => {
          if (!l.expiryDate || l.status !== 'ACTIVE') return false;
          const daysUntilExpiry = Math.floor(
            (new Date(l.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
        }).length || 0;

        // Convert Prisma Decimal types to numbers for proper JSON serialization
        return {
          ...home,
          priceMin: home.priceMin ? Number(home.priceMin) : null,
          priceMax: home.priceMax ? Number(home.priceMax) : null,
          occupancyRate,
          activeResidents,
          averageRating,
          reviewCount: home.reviews?.length || 0,
          photoCount: home.photos?.length || 0,
          activeLicenses,
          expiringLicenses,
        };
      } catch (metricError) {
        console.error('[Homes API] Error calculating metrics for home:', home.id, metricError);
        // Return home with default metrics if calculation fails
        return {
          ...home,
          priceMin: home.priceMin ? Number(home.priceMin) : null,
          priceMax: home.priceMax ? Number(home.priceMax) : null,
          occupancyRate: '0',
          activeResidents: 0,
          averageRating: null,
          reviewCount: 0,
          photoCount: 0,
          activeLicenses: 0,
          expiringLicenses: 0,
        };
      }
    });

    console.log('[Homes API] Metrics calculated for all homes');

    // If export, return CSV
    if (exportData) {
      const csv = generateCSV(homesWithMetrics);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="homes-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      homes: homesWithMetrics,
      totalCount,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error('Failed to fetch homes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function generateCSV(homes: any[]): string {
  const headers = [
    'ID',
    'Name',
    'Operator',
    'Status',
    'Care Levels',
    'Capacity',
    'Current Occupancy',
    'Occupancy Rate',
    'Active Residents',
    'City',
    'State',
    'Price Range',
    'Average Rating',
    'Review Count',
    'Photo Count',
    'Active Licenses',
    'Expiring Licenses',
    'Created At',
  ];

  const rows = homes.map((home) => [
    home.id,
    home.name,
    home.operator.companyName,
    home.status,
    home.careLevel.join('; '),
    home.capacity,
    home.currentOccupancy,
    `${home.occupancyRate}%`,
    home.activeResidents,
    home.address?.city || '',
    home.address?.state || '',
    home.priceMin && home.priceMax ? `$${home.priceMin} - $${home.priceMax}` : '',
    home.averageRating || 'N/A',
    home.reviewCount,
    home.photoCount,
    home.activeLicenses,
    home.expiringLicenses,
    new Date(home.createdAt).toLocaleDateString(),
  ]);

  return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}
