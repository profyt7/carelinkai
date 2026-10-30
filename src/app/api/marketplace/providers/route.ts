
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { isMockModeEnabled } from '@/lib/mockMode';
import { isMockViewerAllowed } from '@/lib/mockMode.server';
import { generateMockProviders, filterMockProviders } from '@/lib/mock/providers';
import { isPaidFeatureEnabled } from '@/lib/billing/paid-features';
import { boostedWhere, isBoosted, notBoostedWhere, twoTierPage } from '@/lib/providers/boost';
import { parseCategoryParam, storedValuesFor } from '@/lib/providers/categories';

/**
 * GET /api/marketplace/providers
 * 
 * Fetches providers with optional filters
 * Supports filtering by: q, serviceTypes (csv of launch categories; serviceType/services still read), city, state, verified
 * Supports pagination with page and pageSize parameters
 * 
 * Mock Mode Support:
 * - When carelink_mock_mode cookie is set to "1", returns mock data
 * - This allows admins to toggle between real and mock data via /admin/tools
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Check if mock mode is requested (cookie/env) AND the requester may see
    // mocks (prod: admins only). Real families never get sample providers.
    const useMockData = isMockModeEnabled(request) && (await isMockViewerAllowed());

    // If mock mode is enabled, return mock data
    if (useMockData) {
      // Extract filter parameters for mock data filtering
      const q = searchParams.get('q') || undefined;
      const serviceType = parseCategoryParam(searchParams).join(',') || undefined;
      const city = searchParams.get('city') || undefined;
      const state = searchParams.get('state') || undefined;
      const verified = searchParams.get('verified') || undefined;
      const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
      const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;
      
      // Generate mock providers
      const allMockProviders = generateMockProviders(12);
      
      // Apply filters
      const filteredProviders = filterMockProviders(allMockProviders, {
        q,
        serviceType,
        city,
        state,
        verified,
      });
      
      // Apply pagination
      const skip = (page - 1) * pageSize;
      const paginatedProviders = filteredProviders.slice(skip, skip + pageSize);
      const totalCount = filteredProviders.length;
      const totalPages = Math.ceil(totalCount / pageSize);
      const hasNextPage = page < totalPages;
      
      return NextResponse.json(
        {
          data: paginatedProviders,
          pagination: {
            page,
            pageSize,
            total: totalCount,
            totalPages,
            hasNextPage,
          },
          _mockMode: true, // Indicate that this is mock data
        },
        { 
          status: 200, 
          headers: { 
            'Cache-Control': 'no-store', // Don't cache mock data
            'X-Mock-Data': 'true' 
          } 
        }
      );
    }
    
    // Extract filter parameters
    const idsParam = searchParams.get('ids');
    const ids = idsParam ? idsParam.split(',').map((s) => s.trim()).filter(Boolean) : null;
    const q = searchParams.get('q');
    // `serviceTypes` (csv) is what /marketplace/providers sends; each launch category also matches
    // its legacy stored values (see src/lib/providers/categories.ts). Old serviceType/services links still work.
    const serviceTypeFilters = storedValuesFor(parseCategoryParam(searchParams));
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const verified = searchParams.get('verified');
    const wheelchairAccessible = searchParams.get('wheelchairAccessible');
    const acceptsMedicaid = searchParams.get('acceptsMedicaid');
    
    // Pagination parameters
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1;
    const pageSize = searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 20;
    const skip = (page - 1) * pageSize;
    // Provider Boost (10/29): boosted providers rank first. Off → today's single query, unchanged.
    const boostOn = isPaidFeatureEnabled('PROVIDER_BOOST');
    
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
        
        // Extract city and state from coverageArea
        let city = null;
        let state = null;
        if (provider.coverageArea && typeof provider.coverageArea === 'object') {
          const coverage = provider.coverageArea as any;
          if (Array.isArray(coverage.cities) && coverage.cities.length > 0) {
            city = coverage.cities[0];
          }
          if (Array.isArray(coverage.states) && coverage.states.length > 0) {
            state = coverage.states[0];
          }
        }
        
        return {
          id: provider.id,
          userId: provider.user.id,
          businessName: provider.businessName,
          contactName: provider.contactName,
          bio: provider.bio || null,
          city,
          state,
          serviceTypes: provider.serviceTypes || [],
          coverageArea: provider.coverageArea,
          yearsInBusiness: provider.yearsInBusiness,
          isVerified: provider.isVerified,
          // Boost is visibility only; isVerified above is untouched by it.
          boosted: boostOn && isBoosted(provider),
          website: provider.website,
          photoUrl,
          credentialCount: provider.credentials.length,
          verifiedCredentialCount: provider.credentials.filter((c: any) => c.status === 'VERIFIED').length,
          ratingAverage: 0, // Placeholder - TODO: calculate from reviews
          reviewCount: 0, // Placeholder - TODO: count from reviews
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
    // NULL listingStatus = no subscription yet (grace period) — must be explicitly included
    // because Postgres NULL NOT IN (...) evaluates to NULL (falsy), which would wrongly exclude them.
    const where: any = {
      isActive: true,
      AND: [
        {
          OR: [
            { listingStatus: null },
            { listingStatus: { notIn: ['CANCELED', 'PAST_DUE', 'INCOMPLETE', 'INCOMPLETE_EXPIRED'] } },
          ],
        },
      ],
    };


    // Text search in bio, business name, or contact name
    if (q) {
      where.OR = [
        { bio: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { contactName: { contains: q, mode: 'insensitive' } }
      ];
    }

    // Service type filter — supports multiple selected services (any match)
    if (serviceTypeFilters.length === 1) {
      where.serviceTypes = { has: serviceTypeFilters[0] };
    } else if (serviceTypeFilters.length > 1) {
      where.serviceTypes = { hasSome: serviceTypeFilters };
    }

    // Verified filter — only apply when explicitly set to "true" or "false"
    if (verified === 'true' || verified === 'false') {
      where.isVerified = verified === 'true';
    }

    // Transport filters
    if (wheelchairAccessible === 'true') where.wheelchairAccessible = true;
    if (acceptsMedicaid === 'true') where.acceptsMedicaid = true;
    
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
    const providerInclude = {
      user: {
        select: { id: true, firstName: true, lastName: true, profileImageUrl: true },
      },
      credentials: {
        select: { id: true, type: true, status: true, expiresAt: true },
      },
    } as const;
    const now = new Date();
    let providers: any[];
    let totalCount: number;
    if (!boostOn) {
      [providers, totalCount] = await Promise.all([
        prisma.provider.findMany({ where, include: providerInclude, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
        prisma.provider.count({ where }),
      ]);
    } else {
      // Boosted rows fill the page first, then the rest; each tier keeps the newest-first order.
      const boostedFilter = { AND: [where, boostedWhere(now)] };
      const restFilter = { AND: [where, notBoostedWhere(now)] };
      const [boostedTotal, total] = await Promise.all([prisma.provider.count({ where: boostedFilter }), prisma.provider.count({ where })]);
      const t = twoTierPage(skip, pageSize, boostedTotal);
      const [boostedRows, restRows] = await Promise.all([
        t.boostedTake > 0 ? prisma.provider.findMany({ where: boostedFilter, include: providerInclude, orderBy: { createdAt: 'desc' }, skip: t.boostedSkip, take: t.boostedTake }) : Promise.resolve([]),
        t.restTake > 0 ? prisma.provider.findMany({ where: restFilter, include: providerInclude, orderBy: { createdAt: 'desc' }, skip: t.restSkip, take: t.restTake }) : Promise.resolve([]),
      ]);
      providers = [...boostedRows, ...restRows];
      totalCount = total;
    }
    
    // Format provider data
    const formattedProviders = providers.map((provider: any) => {
      let photoUrl = null as string | null;
      if (provider.user.profileImageUrl) {
        if (typeof provider.user.profileImageUrl === 'string') photoUrl = provider.user.profileImageUrl;
        else if ((provider.user.profileImageUrl as any).medium) photoUrl = (provider.user.profileImageUrl as any).medium;
        else if ((provider.user.profileImageUrl as any).thumbnail) photoUrl = (provider.user.profileImageUrl as any).thumbnail;
        else if ((provider.user.profileImageUrl as any).large) photoUrl = (provider.user.profileImageUrl as any).large;
      }
      
      // Extract city and state from coverageArea
      let city = null;
      let state = null;
      if (provider.coverageArea && typeof provider.coverageArea === 'object') {
        const coverage = provider.coverageArea as any;
        if (Array.isArray(coverage.cities) && coverage.cities.length > 0) {
          city = coverage.cities[0];
        }
        if (Array.isArray(coverage.states) && coverage.states.length > 0) {
          state = coverage.states[0];
        }
      }
      
      return {
        id: provider.id,
        userId: provider.user.id,
        businessName: provider.businessName,
        contactName: provider.contactName,
        bio: provider.bio || null,
        city,
        state,
        serviceTypes: provider.serviceTypes || [],
        coverageArea: provider.coverageArea,
        yearsInBusiness: provider.yearsInBusiness,
        isVerified: provider.isVerified,
        boosted: boostOn && isBoosted(provider, now),
        website: provider.website,
        photoUrl,
        credentialCount: provider.credentials.length,
        verifiedCredentialCount: provider.credentials.filter((c: any) => c.status === 'VERIFIED').length,
        ratingAverage: 0,
        reviewCount: 0,
        deliveryModes: provider.deliveryModes || [],
        // Transport fields
        rideTypes: provider.rideTypes || [],
        wheelchairAccessible: provider.wheelchairAccessible,
        acceptsMedicaid: provider.acceptsMedicaid,
        serviceRadius: provider.serviceRadius,
        allowsRecurring: provider.allowsRecurring,
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
    
    // Fall back to mock data only when the requester may see mocks (non-prod,
    // or a prod admin) — never leak sample data to real users on an error.
    const useMockData =
      (isMockModeEnabled(request) || process.env.NODE_ENV !== 'production') &&
      (await isMockViewerAllowed());

    if (useMockData) {
      const mockProviders = generateMockProviders(12);
      
      return NextResponse.json(
        {
          data: mockProviders,
          pagination: {
            page: 1,
            pageSize: 20,
            total: mockProviders.length,
            totalPages: 1,
            hasNextPage: false,
          },
          _mockMode: true,
          _fallback: true, // Indicate this is a fallback response
        },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
            'X-Mock-Data': 'true'
          }
        }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch providers' },
      { status: 500 }
    );
  }
}
