/**
 * Operator Lead Detail & Update API for CareLinkAI
 * 
 * This API handles individual lead operations:
 * - GET: Retrieve detailed lead information
 * - PATCH: Update lead status, notes, or assignment
 * 
 * Features:
 * - RBAC enforcement (OPERATOR or ADMIN role only)
 * - Input validation with Zod
 * - Audit logging for status changes
 * - Comprehensive error handling
 * - Includes all related data (Family, Caregiver/Provider, assignedOperator)
 * 
 * Related Models:
 * - Lead (main entity)
 * - Family (with User info)
 * - Caregiver/Provider (based on targetType)
 * - User (assigned operator)
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, LeadStatus, AuditAction } from "@prisma/client";
import { requireAnyRole } from "@/lib/rbac";
import { z } from "zod";

const prisma = new PrismaClient();

// Lead update validation schema
const leadUpdateSchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  operatorNotes: z.string().max(5000, "Operator notes must not exceed 5000 characters").optional().nullable(),
  assignedOperatorId: z.string().optional().nullable(),
});

/**
 * GET handler to retrieve detailed lead information
 * 
 * @param request Request object
 * @param params Route params containing lead id
 * @returns Complete lead details with all relations
 * @throws 401 if not authenticated
 * @throws 403 if not OPERATOR or ADMIN role
 * @throws 404 if lead not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Enforce RBAC - only OPERATOR or ADMIN can access
    const { session, error } = await requireAnyRole(["OPERATOR", "ADMIN"] as any);
    if (error) return error;

    const leadId = params.id;

    // Fetch lead with all relations
    const lead = await prisma.lead.findUnique({
      where: { 
        id: leadId,
        deletedAt: null // Only non-deleted leads
      },
      include: {
        family: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
              }
            }
          }
        },
        aide: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                profileImageUrl: true,
              }
            }
          }
        },
        provider: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
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
    });

    // Handle not found
    if (!lead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found"
        },
        { status: 404 }
      );
    }

    // Create audit log for viewing lead
    await prisma.auditLog.create({
      data: {
        action: AuditAction.READ,
        resourceType: "LEAD",
        resourceId: lead.id,
        description: `Operator viewed lead details`,
        ipAddress: request.headers.get("x-forwarded-for") || "unknown",
        userId: session!.user!.id!,
        actionedBy: session!.user!.id!,
      }
    });

    // Return lead details
    return NextResponse.json({
      success: true,
      data: lead
    });

  } catch (error: any) {
    console.error("Lead detail retrieval error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve lead details",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PATCH handler to update lead information
 * 
 * @param request Request object with update data
 * @param params Route params containing lead id
 * @returns Updated lead
 * @throws 401 if not authenticated
 * @throws 403 if not OPERATOR or ADMIN role
 * @throws 400 if validation fails
 * @throws 404 if lead or assigned operator not found
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Enforce RBAC - only OPERATOR or ADMIN can update
    const { session, error } = await requireAnyRole(["OPERATOR", "ADMIN"] as any);
    if (error) return error;

    const leadId = params.id;
    const userId = session!.user!.id!;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = leadUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid input data",
          errors: validationResult.error.flatten().fieldErrors
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Check if lead exists
    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId, deletedAt: null }
    });

    if (!existingLead) {
      return NextResponse.json(
        {
          success: false,
          message: "Lead not found"
        },
        { status: 404 }
      );
    }

    // If assignedOperatorId is provided, validate it exists and has correct role
    if (validatedData.assignedOperatorId) {
      const operator = await prisma.user.findUnique({
        where: { id: validatedData.assignedOperatorId },
        select: { role: true }
      });

      if (!operator || (operator.role !== "OPERATOR" && operator.role !== "ADMIN")) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid operator assignment. User must be an OPERATOR or ADMIN."
          },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    const changedFields: string[] = [];

    if (validatedData.status !== undefined && validatedData.status !== existingLead.status) {
      updateData.status = validatedData.status;
      changedFields.push(`status: ${existingLead.status} → ${validatedData.status}`);
    }

    if (validatedData.operatorNotes !== undefined) {
      updateData.operatorNotes = validatedData.operatorNotes;
      changedFields.push("operatorNotes");
    }

    if (validatedData.assignedOperatorId !== undefined) {
      updateData.assignedOperatorId = validatedData.assignedOperatorId;
      changedFields.push(`assignment: ${existingLead.assignedOperatorId || "unassigned"} → ${validatedData.assignedOperatorId || "unassigned"}`);
    }

    // Perform update
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData,
      include: {
        family: {
          include: {
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
          include: {
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
          include: {
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
    });

    // Create audit log for lead update
    if (changedFields.length > 0) {
      await prisma.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          resourceType: "LEAD",
          resourceId: leadId,
          description: `Operator updated lead: ${changedFields.join(", ")}`,
          ipAddress: request.headers.get("x-forwarded-for") || "unknown",
          metadata: {
            changes: changedFields,
            previousStatus: existingLead.status,
            newStatus: validatedData.status
          },
          userId: userId,
          actionedBy: userId,
        }
      });
    }

    // Return updated lead
    return NextResponse.json({
      success: true,
      message: "Lead updated successfully",
      data: updatedLead
    });

  } catch (error: any) {
    console.error("Lead update error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update lead",
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
