import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/marketplace/providers/[id]
 * 
 * Fetches a single provider by ID with full details
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
    
    // Fetch provider with all related data
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
