
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isMockModeEnabled } from '@/lib/mockMode';
import { getMockProviderDetail } from '@/lib/mock/providers';

/**
 * GET /api/marketplace/providers/[id]
 * 
 * Fetches a single provider by ID with full details
 * Supports mock mode for development and testing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Provider ID is required' },
        { status: 400 }
      );
    }
    
    // Check if mock mode is enabled
    const mockMode = isMockModeEnabled(request);
    
    // Handle mock provider requests (support both mock- and pr_ prefixes)
    // Also check if marketplace mocks are enabled by default (for demo/testing)
    const isMarketplaceMockId = id.startsWith('pr_') || id.startsWith('mock-');
    
    // Check marketplace-specific mock mode (defaults to true since we don't have real providers yet)
    const marketplaceMockCookie = request.cookies.get('carelink_marketplace_mock')?.value?.toLowerCase() || '';
    const marketplaceMockEnv = (process.env['SHOW_MARKETPLACE_MOCKS'] ?? '').toLowerCase();
    const marketplaceEnvDisabled = ['0', 'false', 'no', 'off'].includes(marketplaceMockEnv);
    
    // Marketplace mock mode defaults to TRUE unless explicitly disabled
    let showMarketplace = true;
    if (['0', 'false', 'no', 'off'].includes(marketplaceMockCookie)) {
      showMarketplace = false;
    } else if (marketplaceEnvDisabled && !['1', 'true', 'yes', 'on'].includes(marketplaceMockCookie)) {
      showMarketplace = false;
    }
    
    if ((mockMode || showMarketplace) && isMarketplaceMockId) {
      const mockProvider = getMockProviderDetail(id);
      
      if (!mockProvider) {
        return NextResponse.json(
          { error: 'Provider not found' },
          { status: 404 }
        );
      }
      
      // Format response to match the expected structure
      const formattedProvider = {
        id: mockProvider.id,
        userId: mockProvider.userId,
        businessName: mockProvider.businessName,
        contactName: mockProvider.contactName,
        contactEmail: mockProvider.contactEmail,
        contactPhone: mockProvider.contactPhone,
        bio: mockProvider.bio,
        website: mockProvider.website,
        insuranceInfo: mockProvider.insuranceInfo,
        licenseNumber: mockProvider.licenseNumber,
        yearsInBusiness: mockProvider.yearsInBusiness,
        isVerified: mockProvider.isVerified,
        serviceTypes: mockProvider.serviceTypes,
        coverageArea: mockProvider.coverageArea,
        photoUrl: mockProvider.photoUrl,
        credentials: mockProvider.credentials,
        memberSince: mockProvider.memberSince,
      };
      
      return NextResponse.json(
        { data: formattedProvider },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
            'X-Mock-Data': 'true'
          }
        }
      );
    }
    
    // Fetch real provider with all related data
    const provider = await prisma.provider.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImageUrl: true,
            createdAt: true,
          },
        },
        credentials: {
          where: {
            status: 'VERIFIED' // Only show verified credentials in public view
          },
          select: {
            id: true,
            type: true,
            status: true,
            expiresAt: true,
            verifiedAt: true,
          },
        },
      },
    });
    
    if (!provider) {
      return NextResponse.json(
        { error: 'Provider not found' },
        { status: 404 }
      );
    }
    
    // Check if provider is active
    if (!provider.isActive) {
      return NextResponse.json(
        { error: 'Provider is not currently active' },
        { status: 404 }
      );
    }
    
    // Format photo URL
    let photoUrl = null as string | null;
    if (provider.user.profileImageUrl) {
      if (typeof provider.user.profileImageUrl === 'string') {
        photoUrl = provider.user.profileImageUrl;
      } else if ((provider.user.profileImageUrl as any).large) {
        photoUrl = (provider.user.profileImageUrl as any).large;
      } else if ((provider.user.profileImageUrl as any).medium) {
        photoUrl = (provider.user.profileImageUrl as any).medium;
      } else if ((provider.user.profileImageUrl as any).thumbnail) {
        photoUrl = (provider.user.profileImageUrl as any).thumbnail;
      }
    }
    
    // Format response
    const formattedProvider = {
      id: provider.id,
      userId: provider.user.id,
      businessName: provider.businessName,
      contactName: provider.contactName,
      contactEmail: provider.contactEmail,
      contactPhone: provider.contactPhone,
      bio: provider.bio,
      website: provider.website,
      insuranceInfo: provider.insuranceInfo,
      licenseNumber: provider.licenseNumber,
      yearsInBusiness: provider.yearsInBusiness,
      isVerified: provider.isVerified,
      serviceTypes: provider.serviceTypes || [],
      coverageArea: provider.coverageArea,
      photoUrl,
      credentials: provider.credentials,
      memberSince: provider.createdAt,
    };
    
    return NextResponse.json(
      { data: formattedProvider },
      { 
        status: 200, 
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120' } 
      }
    );
  } catch (error) {
    console.error('Error fetching provider:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider' },
      { status: 500 }
    );
  }
}
