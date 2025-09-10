import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Validate credential update input
const credentialUpdateSchema = z.object({
  type: z.string().min(1, "Type is required").max(100).optional(),
  issueDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Issue date must be a valid date in ISO format",
  }).optional(),
  expirationDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Expiration date must be a valid date in ISO format",
  }).optional(),
  documentUrl: z.string().url().optional(),
}).refine(data => {
  // Only validate dates if both are provided
  if (data.issueDate && data.expirationDate) {
    const issueDate = new Date(data.issueDate);
    const expirationDate = new Date(data.expirationDate);
    return expirationDate > issueDate;
  }
  return true;
}, {
  message: "Expiration date must be after issue date",
  path: ["expirationDate"],
});

// PATCH handler for updating credentials
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });
    }

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Find credential and verify ownership
    const credential = await prisma.credential.findUnique({
      where: { id },
      select: { id: true, caregiverId: true }
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    if (credential.caregiverId !== caregiver.id) {
      return NextResponse.json({ error: "You do not have permission to update this credential" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    // Validate input
    const validationResult = credentialUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const updates: any = {};
    const { type, issueDate, expirationDate, documentUrl } = validationResult.data;

    // Only include provided fields in update
    if (type !== undefined) updates.type = type;
    if (issueDate !== undefined) updates.issueDate = new Date(issueDate);
    if (expirationDate !== undefined) updates.expirationDate = new Date(expirationDate);
    if (documentUrl !== undefined) updates.documentUrl = documentUrl;

    // Update credential
    const updatedCredential = await prisma.credential.update({
      where: { id },
      data: updates
    });

    // Return updated credential
    return NextResponse.json({
      success: true,
      credential: updatedCredential
    });

  } catch (error) {
    console.error("Error updating credential:", error);
    return NextResponse.json(
      { error: "Failed to update credential" },
      { status: 500 }
    );
  }
}

// DELETE handler for removing credentials
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get session and verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });
    }

    // Find caregiver record for current user
    const caregiver = await prisma.caregiver.findUnique({
      where: { userId: session.user.id },
      select: { id: true }
    });

    if (!caregiver) {
      return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });
    }

    // Find credential and verify ownership
    const credential = await prisma.credential.findUnique({
      where: { id },
      select: { id: true, caregiverId: true }
    });

    if (!credential) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    if (credential.caregiverId !== caregiver.id) {
      return NextResponse.json({ error: "You do not have permission to delete this credential" }, { status: 403 });
    }

    // Delete credential
    await prisma.credential.delete({
      where: { id }
    });

    // Return success response
    return NextResponse.json({
      success: true
    });

  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json(
      { error: "Failed to delete credential" },
      { status: 500 }
    );
  }
}
