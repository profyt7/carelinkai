import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const credentialUpdateSchema = z.object({
  type: z.string().min(1, "Type is required").max(100).optional(),
  issueDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Issue date must be a valid date in ISO format" }).optional(),
  expirationDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Expiration date must be a valid date in ISO format" }).optional(),
  documentUrl: z.string().url().optional(),
}).refine(data => {
  if (data.issueDate && data.expirationDate) {
    return new Date(data.expirationDate) > new Date(data.issueDate);
  }
  return true;
}, { message: "Expiration date must be after issue date", path: ["expirationDate"] });

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });

    const caregiver = await prisma.caregiver.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!caregiver) return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });

    const credential = await prisma.credential.findUnique({ where: { id }, select: { id: true, caregiverId: true } });
    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (credential.caregiverId !== caregiver.id) return NextResponse.json({ error: "You do not have permission to update this credential" }, { status: 403 });

    const body = await request.json();
    const validationResult = credentialUpdateSchema.safeParse(body);
    if (!validationResult.success) return NextResponse.json({ error: "Invalid input", details: validationResult.error.format() }, { status: 400 });

    const { type, issueDate, expirationDate, documentUrl } = validationResult.data;
    const updates: any = {};
    if (type !== undefined) updates.type = type;
    if (issueDate !== undefined) updates.issueDate = new Date(issueDate);
    if (expirationDate !== undefined) updates.expirationDate = new Date(expirationDate);
    if (documentUrl !== undefined) updates.documentUrl = documentUrl;

    const updatedCredential = await prisma.credential.update({ where: { id }, data: updates });
    return NextResponse.json({ success: true, credential: updatedCredential });
  } catch (error) {
    console.error("Error updating credential:", error);
    return NextResponse.json({ error: "Failed to update credential" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });

    const caregiver = await prisma.caregiver.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!caregiver) return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });

    const credential = await prisma.credential.findUnique({ where: { id }, select: { id: true, caregiverId: true } });
    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (credential.caregiverId !== caregiver.id) return NextResponse.json({ error: "You do not have permission to delete this credential" }, { status: 403 });

    await prisma.credential.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json({ error: "Failed to delete credential" }, { status: 500 });
  }
}