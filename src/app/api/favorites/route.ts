/**
 * Favorites API for CareLinkAI
 * 
 * This API allows family users to manage their favorite assisted living homes.
 * 
 * Endpoints:
 * - GET /api/favorites - Get all favorites for the current user's family
 * - POST /api/favorites - Add a home to favorites
 * - DELETE /api/favorites?homeId=xxx - Remove a home from favorites
 */

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, UserRole } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-db-simple';

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * GET handler - Retrieve all favorites for the current user's family
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
    
    // Get user with family relationship
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { family: true }
    });
    
    // Check if user has family role
    if (!user || user.role !== UserRole.FAMILY || !user.family) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only family users can access favorites' 
      }, { status: 403 });
    }
    
    // Get all favorites with home details
    const favorites = await prisma.favoriteHome.findMany({
      where: {
        familyId: user.family.id
      },
      include: {
        home: {
          include: {
            address: true,
            photos: {
              where: { isPrimary: true },
              take: 1
            },
            operator: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Format the response
    const formattedFavorites = favorites.map(favorite => ({
      id: favorite.id,
      homeId: favorite.homeId,
      notes: favorite.notes,
      createdAt: favorite.createdAt,
      home: {
        id: favorite.home.id,
        name: favorite.home.name,
        description: favorite.home.description,
        address: favorite.home.address ? {
          city: favorite.home.address.city,
          state: favorite.home.address.state,
          zipCode: favorite.home.address.zipCode
        } : null,
        careLevel: favorite.home.careLevel,
        priceRange: {
          min: favorite.home.priceMin ? Number(favorite.home.priceMin) : null,
          max: favorite.home.priceMax ? Number(favorite.home.priceMax) : null
        },
        capacity: favorite.home.capacity,
        availability: favorite.home.capacity - favorite.home.currentOccupancy,
        amenities: favorite.home.amenities,
        imageUrl: favorite.home.photos?.[0]?.url ?? null,
        operator: favorite.home.operator ? {
          name: `${favorite.home.operator.user.firstName} ${favorite.home.operator.user.lastName}`,
          email: favorite.home.operator.user.email
        } : null
      }
    }));
    
    // Return response
    return NextResponse.json({
      success: true,
      favorites: formattedFavorites
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error fetching favorites:', error);
    
    return NextResponse.json({
      success: false,
      error: 'An error occurred while fetching favorites',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}

/**
 * POST handler - Add a home to favorites
 */
export async function POST(request: NextRequest) {
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
    
    // Get user with family relationship
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { family: true }
    });
    
    // Check if user has family role
    if (!user || user.role !== UserRole.FAMILY || !user.family) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only family users can add favorites' 
      }, { status: 403 });
    }
    
    // Parse request body
    const body = await request.json();
    const { homeId, notes } = body;
    
    // Validate homeId
    if (!homeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Home ID is required' 
      }, { status: 400 });
    }
    
    // Check if home exists
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId }
    });
    
    if (!home) {
      return NextResponse.json({ 
        success: false, 
        error: 'Home not found' 
      }, { status: 404 });
    }
    
    // Check if favorite already exists
    const existingFavorite = await prisma.favoriteHome.findFirst({
      where: {
        familyId: user.family.id,
        homeId
      }
    });
    
    if (existingFavorite) {
      return NextResponse.json({ 
        success: false, 
        error: 'Home is already in favorites',
        favoriteId: existingFavorite.id
      }, { status: 409 });
    }
    
    // Create favorite
    const favorite = await prisma.favoriteHome.create({
      data: {
        familyId: user.family.id,
        homeId,
        notes: notes || null
      }
    });
    
    // Return response
    return NextResponse.json({
      success: true,
      message: 'Home added to favorites',
      favorite
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error adding favorite:', error);
    
    return NextResponse.json({
      success: false,
      error: 'An error occurred while adding favorite',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}

/**
 * DELETE handler - Remove a home from favorites
 */
export async function DELETE(request: NextRequest) {
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
    
    // Get user with family relationship
    const user = await prisma.user.findUnique({
      where: { email: session.user.email as string },
      include: { family: true }
    });
    
    // Check if user has family role
    if (!user || user.role !== UserRole.FAMILY || !user.family) {
      return NextResponse.json({ 
        success: false, 
        error: 'Only family users can remove favorites' 
      }, { status: 403 });
    }
    
    // Get homeId from URL
    const { searchParams } = new URL(request.url);
    const homeId = searchParams.get('homeId');
    
    // Validate homeId
    if (!homeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Home ID is required' 
      }, { status: 400 });
    }
    
    // Check if favorite exists
    const favorite = await prisma.favoriteHome.findFirst({
      where: {
        familyId: user.family.id,
        homeId
      }
    });
    
    if (!favorite) {
      return NextResponse.json({ 
        success: false, 
        error: 'Favorite not found' 
      }, { status: 404 });
    }
    
    // Delete favorite
    await prisma.favoriteHome.delete({
      where: { id: favorite.id }
    });
    
    // Return response
    return NextResponse.json({
      success: true,
      message: 'Home removed from favorites'
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error removing favorite:', error);
    
    return NextResponse.json({
      success: false,
      error: 'An error occurred while removing favorite',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  } finally {
    // Always disconnect from the database
    await prisma.$disconnect();
  }
}
