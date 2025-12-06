import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * GET /api/marketplace/providers
 * 
 * Fetches providers with optional filters
 * Supports filtering by: q, serviceType, city, state, verified
 * Supports pagination with page and pageSize parameters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract filter parameters
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : null;
    const q = searchParams.get('q');
    const serviceType = searchParams.get('serviceType');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const verified = searchParams.get('verified');
    
    // Pagination parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;
    const skip = (page - 1) * pageSize;
    
    // If explicit IDs are provided, short-circuit to fetch those providers only
    if (ids && ids.length > 0) {
      const providers = await prisma.provider.findMany({
        where: { id: { in: ids }, isActive: true },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImageUrl: true,
            },
          },
          credentials: {
            select: {
              id: true,
              type: true,
              status: true,
              expiresAt: true,
            },
          },
        },
      });

      const formattedProviders = providers.map((provider: any) => {
        let photoUrl = null as string | null;
        if (provider.user.profileImageUrl) {
          if (typeof provider.user.profileImageUrl === 'string') photoUrl = provider.user.profileImageUrl;
          else if ((provider.user.profileImageUrl as any).medium) photoUrl = (provider.user.profileImageUrl as any).medium;
          else if ((provider.user.profileImageUrl as any).thumbnail) photoUrl = (provider.user.profileImageUrl as any).thumbnail;
          else if ((provider.user.profileImageUrl as any).large) photoUrl = (provider.user.profileImageUrl as any).large;
        }
        
        return {
          id: provider.id,
          userId: provider.user.id,
          businessName: provider.businessName,
          contactName: provider.contactName,
          bio: provider.bio || null,
          serviceTypes: provider.serviceTypes || [],
          coverageArea: provider.coverageArea,
          yearsInBusiness: provider.yearsInBusiness,
          isVerified: provider.isVerified,
          website: provider.website,
          photoUrl,
          credentialCount: provider.credentials.length,
          verifiedCredentialCount: provider.credentials.filter((c: any) => c.status === 'VERIFIED').length,
        };
      });

      return NextResponse.json(
        {
          data: formattedProviders,
          pagination: { page: 1, pageSize: formattedProviders.length, total: formattedProviders.length },
        },
        { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60' } }
      );
    }

    // Build where clause for filtering
    const where: any = { isActive: true };
    
    // Text search in bio, business name, or contact name
    if (q) {
      where.OR = [
        { bio: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    // Service type filter
    if (serviceType) {
      where.serviceTypes = {
        has: serviceType
      };
    }
    
    // Verified filter
    if (verified !== null) {
      where.isVerified = verified === 'true';
    }
    
    // Location filters using coverageArea JSON
    // Note: This is a simplified version. For production, you might want to use proper GIS queries
    if (city || state) {
      // Use JSON path queries for PostgreSQL
      const locationFilters = [];
      if (city) {
        locationFilters.push({
          coverageArea: {
            path: ['cities'],
            array_contains: city
          }
        });
      }
      if (state) {
        locationFilters.push({
          coverageArea: {
            path: ['states'],
            array_contains: state
          }
        });
      }
      
      if (locationFilters.length > 0) {
        where.OR = [...(where.OR || []), ...locationFilters];
      }
    }
    
    // Fetch providers with pagination
    const [providers, totalCount] = await Promise.all([
      prisma.provider.findMany({
        where,
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, profileImageUrl: true }
          },
          credentials: {
            select: {
              id: true,
              type: true,
              status: true,
              expiresAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.provider.count({ where })
    ]);
    
    // Format provider data
    const formattedProviders = providers.map((provider: any) => {
      let photoUrl = null as string | null;
      if (provider.user.profileImageUrl) {
        if (typeof provider.user.profileImageUrl === 'string') photoUrl = provider.user.profileImageUrl;
        else if ((provider.user.profileImageUrl as any).medium) photoUrl = (provider.user.profileImageUrl as any).medium;
        else if ((provider.user.profileImageUrl as any).thumbnail) photoUrl = (provider.user.profileImageUrl as any).thumbnail;
        else if ((provider.user.profileImageUrl as any).large) photoUrl = (provider.user.profileImageUrl as any).large;
      }
      
      return {
        id: provider.id,
        userId: provider.user.id,
        businessName: provider.businessName,
        contactName: provider.contactName,
        bio: provider.bio || null,
        serviceTypes: provider.serviceTypes || [],
        coverageArea: provider.coverageArea,
        yearsInBusiness: provider.yearsInBusiness,
        isVerified: provider.isVerified,
        website: provider.website,
        photoUrl,
        credentialCount: provider.credentials.length,
        verifiedCredentialCount: provider.credentials.filter((c: any) => c.status === 'VERIFIED').length,
      };
    });
    
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    
    return NextResponse.json(
      {
        data: formattedProviders,
        pagination: {
          page,
          pageSize,
          total: totalCount,
          totalPages,
          hasNextPage,
        },
      },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
