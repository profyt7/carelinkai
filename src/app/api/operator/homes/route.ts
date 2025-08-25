/**
 * Operator Homes API Route
 * 
 * Provides endpoint for fetching homes accessible to the current user:
 * - GET: List homes based on user role (OPERATOR: own homes, ADMIN/STAFF: all homes)
 * 
 * @module api/operator/homes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { UserRole } from '@prisma/client';
import { authOptions } from '@/lib/auth-db-simple';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ========================================================================
// HELPER FUNCTIONS
// ========================================================================

/**
 * Handles API errors and returns appropriate responses
 */
function handleApiError(error: unknown) {
  logger.error('Unexpected error in operator homes API', { error });
  return NextResponse.json(
    { 
      success: false, 
      error: 'An unexpected error occurred' 
    }, 
    { status: 500 }
  );
}

// ========================================================================
// API ROUTE HANDLERS
// ========================================================================

/**
 * GET handler for fetching homes accessible to the current user
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' }, 
        { status: 401 }
      );
    }
    
    // 2. Get user role and check permissions
    const userRole = session.user.role as UserRole;
    
    // 3. Only allow OPERATOR, ADMIN, and STAFF roles
    // Use explicit comparisons to keep TypeScript narrow union happy
    if (
      userRole !== UserRole.OPERATOR &&
      userRole !== UserRole.ADMIN &&
      userRole !== UserRole.STAFF
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' }, 
        { status: 403 }
      );
    }
    
    // 4. Parse query parameters
    const url = new URL(request.url);
    const operatorId = url.searchParams.get('operatorId');
    
    // 5. Build filter criteria
    let filter: any = {};
    
    if (userRole === UserRole.OPERATOR) {
      // Operators can only see their own homes
      const operator = await prisma.operator.findUnique({
        where: { userId: session.user.id },
        select: { id: true }
      });
      
      if (!operator) {
        // Operator record not found, return empty result
        return NextResponse.json({
          success: true,
          data: [],
          meta: {
            total: 0
          }
        });
      }
      
      filter.operatorId = operator.id;
    } else if (userRole === UserRole.ADMIN || userRole === UserRole.STAFF) {
      // Admins and staff can see all homes, but can filter by operatorId
      if (operatorId) {
        filter.operatorId = operatorId;
      }
    }
    
    // 6. Get homes with count
    const [homes, total] = await Promise.all([
      prisma.assistedLivingHome.findMany({
        where: filter,
        select: {
          id: true,
          name: true,
          address: true,
          operator: {
            select: {
              id: true,
              companyName: true
            }
          }
        },
        orderBy: { name: 'asc' }
      }),
      prisma.assistedLivingHome.count({ where: filter })
    ]);
    
    // 7. Format the response
    const formattedHomes = homes.map(home => ({
      id: home.id,
      name: home.name,
      address: home.address,
      operator: {
        id: home.operator.id,
        name: home.operator.companyName
      }
    }));
    
    // 8. Return formatted response
    return NextResponse.json({
      success: true,
      data: formattedHomes,
      meta: {
        total
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
