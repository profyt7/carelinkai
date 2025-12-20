/**
 * Unified Favorites API for CareLinkAI
 * 
 * This API fetches ALL favorites for the current user across all types:
 * - Homes (for FAMILY users)
 * - Caregivers (for FAMILY users)
 * - Providers (for FAMILY users)
 * - Listings/Jobs (for CAREGIVER users)
 * 
 * Endpoints:
 * - GET /api/favorites/all - Get all favorites with counts
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';

const prisma = new PrismaClient();

/**
 * GET handler - Retrieve all favorites for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Get user with role-specific relationships
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { 
        family: true,
        caregiver: true
      }
    });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    const result: any = {
      homes: [],
      caregivers: [],
      providers: [],
      listings: [],
      counts: {
        homes: 0,
        caregivers: 0,
        providers: 0,
        listings: 0,
        total: 0
      }
    };

    // Fetch FAMILY-specific favorites
    if (user.role === UserRole.FAMILY && user.family) {
      // Fetch favorite homes
      const favoriteHomes = await prisma.favoriteHome.findMany({
        where: { familyId: user.family.id },
        include: {
          home: {
            include: {
              address: true,
              photos: {
                where: { isPrimary: true },
                take: 1
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch favorite caregivers
      const favoriteCaregivers = await prisma.favoriteCaregiver.findMany({
        where: { familyId: user.family.id },
        include: {
          caregiver: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImageUrl: true
                }
              },
              reviews: {
                select: {
                  rating: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch favorite providers
      const favoriteProviders = await prisma.favoriteProvider.findMany({
        where: { familyId: user.family.id },
        include: {
          provider: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                  profileImageUrl: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Format homes
      result.homes = favoriteHomes.map(fav => ({
        id: fav.id,
        itemId: fav.homeId,
        type: 'home',
        createdAt: fav.createdAt,
        notes: fav.notes,
        home: {
          id: fav.home.id,
          name: fav.home.name,
          description: fav.home.description,
          address: fav.home.address ? {
            city: fav.home.address.city,
            state: fav.home.address.state,
            zipCode: fav.home.address.zipCode
          } : null,
          careLevel: fav.home.careLevel,
          priceRange: {
            min: fav.home.priceMin ? Number(fav.home.priceMin) : null,
            max: fav.home.priceMax ? Number(fav.home.priceMax) : null
          },
          capacity: fav.home.capacity,
          availability: fav.home.capacity - fav.home.currentOccupancy,
          amenities: fav.home.amenities,
          imageUrl: fav.home.photos?.[0]?.url ?? null
        }
      }));

      // Format caregivers
      result.caregivers = favoriteCaregivers.map(fav => {
        const avgRating = fav.caregiver.reviews.length > 0
          ? fav.caregiver.reviews.reduce((sum, r) => sum + r.rating, 0) / fav.caregiver.reviews.length
          : null;
        
        return {
          id: fav.id,
          itemId: fav.caregiverId,
          type: 'caregiver',
          createdAt: fav.createdAt,
          caregiver: {
            id: fav.caregiver.id,
            name: `${fav.caregiver.user.firstName} ${fav.caregiver.user.lastName}`,
            bio: fav.caregiver.bio,
            hourlyRate: fav.caregiver.hourlyRate ? Number(fav.caregiver.hourlyRate) : null,
            yearsExperience: fav.caregiver.yearsExperience,
            specialties: fav.caregiver.specialties,
            settings: fav.caregiver.settings,
            careTypes: fav.caregiver.careTypes,
            photoUrl: fav.caregiver.user.profileImageUrl,
            backgroundCheckStatus: fav.caregiver.backgroundCheckStatus,
            ratingAverage: avgRating,
            reviewCount: fav.caregiver.reviews.length
          }
        };
      });

      // Format providers
      result.providers = favoriteProviders.map(fav => ({
        id: fav.id,
        itemId: fav.providerId,
        type: 'provider',
        createdAt: fav.createdAt,
        provider: {
          id: fav.provider.id,
          businessName: fav.provider.businessName,
          contactName: fav.provider.contactName,
          bio: fav.provider.bio,
          serviceTypes: fav.provider.serviceTypes,
          website: fav.provider.website,
          yearsInBusiness: fav.provider.yearsInBusiness,
          isVerified: fav.provider.isVerified,
          photoUrl: fav.provider.user.profileImageUrl
        }
      }));
    }

    // Fetch CAREGIVER-specific favorites
    if (user.role === UserRole.CAREGIVER && user.caregiver) {
      const favoriteListings = await prisma.favoriteListing.findMany({
        where: { caregiverId: user.caregiver.id },
        include: {
          listing: {
            include: {
              postedBy: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      result.listings = favoriteListings.map(fav => ({
        id: fav.id,
        itemId: fav.listingId,
        type: 'listing',
        createdAt: fav.createdAt,
        listing: {
          id: fav.listing.id,
          title: fav.listing.title,
          description: fav.listing.description,
          city: fav.listing.city,
          state: fav.listing.state,
          status: fav.listing.status,
          hourlyRateMin: fav.listing.hourlyRateMin ? Number(fav.listing.hourlyRateMin) : null,
          hourlyRateMax: fav.listing.hourlyRateMax ? Number(fav.listing.hourlyRateMax) : null,
          setting: fav.listing.setting,
          careTypes: fav.listing.careTypes,
          services: fav.listing.services,
          specialties: fav.listing.specialties,
          startTime: fav.listing.startTime,
          endTime: fav.listing.endTime,
          postedBy: {
            name: `${fav.listing.postedBy.firstName} ${fav.listing.postedBy.lastName}`,
            email: fav.listing.postedBy.email
          }
        }
      }));
    }

    // Calculate counts
    result.counts = {
      homes: result.homes.length,
      caregivers: result.caregivers.length,
      providers: result.providers.length,
      listings: result.listings.length,
      total: result.homes.length + result.caregivers.length + result.providers.length + result.listings.length
    };

    return NextResponse.json({
      success: true,
      data: result
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching all favorites:', error);
    
    return NextResponse.json({
      success: false,
      error: 'An error occurred while fetching favorites',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
