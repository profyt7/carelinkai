import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validate credential creation input
const credentialCreateSchema = z.object({
  type: z.string().min(1, "Type is required").max(100),
  issueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Issue date must be a valid date in ISO format",
  }),
  expirationDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Expiration date must be a valid date in ISO format",
  }),
  documentUrl: z.string().url().optional(),
}).refine(data => {
  const issueDate = new Date(data.issueDate);
  const expirationDate = new Date(data.expirationDate);
  return expirationDate > issueDate;
}, {
  message: "Expiration date must be after issue date",
  path: ["expirationDate"],
});

// GET handler for fetching credentials
export async function GET(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    
    // Ensure page and limit are valid
    if (isNaN(page) || page < 1) {
      return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 });
    }
    
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });
    }

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Query credentials with pagination
    const [credentials, total] = await Promise.all([
      prisma.credential.findMany({
        where: { caregiverId: caregiver.id },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          documentUrl: true,
          issueDate: true,
          expirationDate: true,
          isVerified: true,
          verifiedAt: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.credential.count({
        where: { caregiverId: caregiver.id }
      })
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    // Return credentials with pagination metadata
    return NextResponse.json({
      credentials,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore
      }
    });

  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json(
      { error: "Failed to fetch credentials" },
      { status: 500 }
    );
  }
}

// POST handler for creating credentials
export async function POST(request: NextRequest) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = credentialCreateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { type, issueDate, expirationDate, documentUrl } = validationResult.data;

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Create credential
    const credential = await prisma.credential.create({
      data: {
        caregiverId: caregiver.id,
        type,
        issueDate: new Date(issueDate),
        expirationDate: new Date(expirationDate),
        documentUrl,
        isVerified: false
      }
    });

    // Return created credential
    return NextResponse.json({
      success: true,
      credential
    });

  } catch (error) {
    console.error("Error creating credential:", error);
    return NextResponse.json(
      { error: "Failed to create credential" },
      { status: 500 }
    );
  }
}
