import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/marketplace/categories
 * 
 * Fetches all marketplace categories grouped by type
 */
export async function GET() {
  try {
    // Fetch all active categories ordered by sortOrder
    const categories = await (prisma as any).marketplaceCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // Group categories by type
    const groupedCategories = categories.reduce((acc: Record<string, any>, category: any) => {
      if (!acc[category.type]) {
        acc[category.type] = [];
      }
      acc[category.type].push({
        id: category.id,
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
      });
      return acc;
    }, {} as Record<string, any>);

    // Return response with cache headers
    return NextResponse.json(
      { data: groupedCategories },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching marketplace categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace categories' },
      { status: 500 }
    );
  }
}

/**
 * Return 405 Method Not Allowed for non-GET requests
 */
export function POST() {
  return methodNotAllowed();
}

export function PUT() {
  return methodNotAllowed();
}

export function PATCH() {
  return methodNotAllowed();
}

export function DELETE() {
  return methodNotAllowed();
}

/**
 * Helper function to return 405 Method Not Allowed
 */
function methodNotAllowed() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    {
      status: 405,
      headers: {
        Allow: 'GET',
      },
    }
  );
}
