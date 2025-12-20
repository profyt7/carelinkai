/**
 * Lead Creation API
 * POST /api/leads - Create a new lead/inquiry from Family to Aide or Provider
 */

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

// Validation schema
const createLeadSchema = z.object({
  targetType: z.enum(["AIDE", "PROVIDER"], {
    required_error: "Target type is required",
    invalid_type_error: "Target type must be AIDE or PROVIDER",
  }),
  targetId: z.string().min(1, "Target ID is required"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be at most 1000 characters"),
  preferredStartDate: z.string().datetime().optional(),
  expectedHoursPerWeek: z
    .number()
    .int()
    .min(1, "Hours per week must be at least 1")
    .max(168, "Hours per week cannot exceed 168")
    .optional(),
  location: z.string().max(255).optional(),
});

type CreateLeadInput = z.infer<typeof createLeadSchema>;

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Role-based access control (only FAMILY can create leads)
    if (session.user.role !== "FAMILY") {
      return NextResponse.json(
        {
          error:
            "Only family members can submit care inquiries. Please register as a family member.",
        },
        { status: 403 }
      );
    }

    // 3. Parse and validate request body
    const body = await req.json();
    const validationResult = createLeadSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data: CreateLeadInput = validationResult.data;

    // 4. Get Family record
    const family = await prisma.family.findUnique({
      where: { userId: session.user.id },
    });

    if (!family) {
      return NextResponse.json(
        {
          error:
            "Family profile not found. Please complete your profile setup.",
        },
        { status: 404 }
      );
    }

    // 5. Validate target exists (Aide or Provider)
    let targetExists = false;
    let targetName = "";

    if (data.targetType === "AIDE") {
      const aide = await prisma.caregiver.findUnique({
        where: { id: data.targetId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (aide) {
        targetExists = true;
        targetName = `${aide.user.firstName} ${aide.user.lastName}`;
      }
    } else if (data.targetType === "PROVIDER") {
      const provider = await prisma.provider.findUnique({
        where: { id: data.targetId },
        select: {
          id: true,
          businessName: true,
        },
      });

      if (provider) {
        targetExists = true;
        targetName = provider.businessName;
      }
    }

    if (!targetExists) {
      return NextResponse.json(
        {
          error: `${data.targetType === "AIDE" ? "Caregiver" : "Provider"} not found.`,
        },
        { status: 404 }
      );
    }

    // 6. Create Lead record
    const lead = await prisma.lead.create({
      data: {
        familyId: family.id,
        targetType: data.targetType,
        aideId: data.targetType === "AIDE" ? data.targetId : null,
        providerId: data.targetType === "PROVIDER" ? data.targetId : null,
        message: data.message,
        preferredStartDate: data.preferredStartDate
          ? new Date(data.preferredStartDate)
          : null,
        expectedHoursPerWeek: data.expectedHoursPerWeek || null,
        location: data.location || null,
        status: "NEW",
      },
    });

    // 7. Audit log
    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      resourceType: "LEAD",
      resourceId: lead.id,
      description: `Created lead inquiry to ${data.targetType}: ${targetName}`,
      metadata: {
        targetType: data.targetType,
        targetId: data.targetId,
        targetName,
        familyId: family.id,
      },
    });

    // 8. Return success response
    return NextResponse.json(
      {
        success: true,
        message: `Your inquiry has been submitted successfully to ${targetName}.`,
        data: {
          leadId: lead.id,
          targetType: lead.targetType,
          targetName,
          status: lead.status,
          createdAt: lead.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating lead:", error);

    // Handle specific errors
    if (error.code === "P2003") {
      // Foreign key constraint violation
      return NextResponse.json(
        {
          error: "Target caregiver or provider not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to submit inquiry. Please try again.",
        details: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
}
