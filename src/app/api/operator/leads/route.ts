/**
 * Operator Lead List API for CareLinkAI
 * 
 * This API handles Operator lead listing operations:
 * - GET: Retrieve paginated list of leads with filtering
 * 
 * Features:
 * - RBAC enforcement (OPERATOR or ADMIN role only)
 * - Multiple filter support (status, targetType, assignedOperatorId)
 * - Pagination with customizable page size
 * - Sorting by multiple fields
 * - Includes related data (Family, Caregiver/Provider, assignedOperator)
 * 
 * Related Models:
 * - Lead (main entity)
 * - Family (inquirer)
 * - Caregiver/Provider (inquiry target)
 * - User (assigned operator)
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, LeadStatus, LeadTargetType } from "@prisma/client";
import { requireAnyRole } from "@/lib/rbac";

const prisma = new PrismaClient();

/**
 * GET handler to retrieve paginated lead list with filters
 * 
 * Query Parameters:
 * - status: LeadStatus | LeadStatus[] (optional) - Filter by status
 * - targetType: LeadTargetType (optional) - Filter by AIDE or PROVIDER
 * - assignedOperatorId: string (optional) - Filter by assigned operator
 * - page: number (default: 1) - Page number
 * - limit: number (default: 20, max: 100) - Items per page
 * - sortBy: string (default: createdAt) - Sort field
 * - sortOrder: 'asc' | 'desc' (default: desc) - Sort order
 * 
 * @returns Paginated list of leads with metadata
 * @throws 401 if not authenticated
 * @throws 403 if not OPERATOR or ADMIN role
 * @throws 400 if invalid parameters
 */
export async function GET(request: NextRequest) {
  try {
    // Enforce RBAC - only OPERATOR or ADMIN can access
    const { session, error } = await requireAnyRole(["OPERATOR", "ADMIN"] as any);
    if (error) return error;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    
    // Filter parameters
    const statusParam = searchParams.get("status");
    const targetType = searchParams.get("targetType") as LeadTargetType | null;
    const assignedOperatorId = searchParams.get("assignedOperatorId");
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const skip = (page - 1) * limit;
    
    // Sorting parameters
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    // Build where clause
    const where: any = {
      deletedAt: null // Only non-deleted leads
    };

    // Handle status filter (can be multiple statuses)
    if (statusParam) {
      const statuses = statusParam.split(",").filter(s => 
        Object.values(LeadStatus).includes(s as LeadStatus)
      ) as LeadStatus[];
      
      if (statuses.length > 0) {
        where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
      }
    }

    // Handle targetType filter
    if (targetType && Object.values(LeadTargetType).includes(targetType)) {
      where.targetType = targetType;
    }

    // Handle assignedOperatorId filter
    if (assignedOperatorId) {
      if (assignedOperatorId === "unassigned") {
        where.assignedOperatorId = null;
      } else if (assignedOperatorId === "me") {
        where.assignedOperatorId = session!.user!.id;
      } else {
        where.assignedOperatorId = assignedOperatorId;
      }
    }

    // Validate sortBy field
    const allowedSortFields = ["createdAt", "updatedAt", "status", "targetType"];
    const orderBy: any = {};
    if (allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    // Execute queries in parallel
    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          family: {
            select: {
              id: true,
              primaryContactName: true,
              phone: true,
              relationshipToRecipient: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                }
              }
            }
          },
          aide: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profileImageUrl: true,
                }
              }
            }
          },
          provider: {
            select: {
              id: true,
              businessName: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  profileImageUrl: true,
                }
              }
            }
          },
          assignedOperator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }),
      prisma.lead.count({ where })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // Return paginated results
    return NextResponse.json({
      success: true,
      data: {
        leads,
        pagination: {
          total,
          pages: totalPages,
          currentPage: page,
          limit,
          hasMore
        }
      }
    });

  } catch (error: any) {
    console.error("Operator leads list error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve leads",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
