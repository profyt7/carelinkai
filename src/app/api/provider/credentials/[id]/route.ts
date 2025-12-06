import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const credentialUpdateSchema = z.object({
  type: z.string().min(1, "Type is required").max(100).optional(),
  expiresAt: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Expiration date must be a valid date in ISO format" }).optional().nullable(),
  documentUrl: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["PROVIDER"] as any);
    if (error) return error;

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });

    const provider = await prisma.provider.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!provider) return NextResponse.json({ error: "User is not registered as a provider" }, { status: 403 });

    const credential = await prisma.providerCredential.findUnique({ 
      where: { id }, 
      select: { 
        id: true, 
        providerId: true, 
        type: true, 
        documentUrl: true, 
        status: true, 
        verifiedAt: true, 
        verifiedBy: true,
        expiresAt: true,
        notes: true,
        createdAt: true, 
        updatedAt: true 
      } 
    });
    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (credential.providerId !== provider.id) return NextResponse.json({ error: "You do not have permission to view this credential" }, { status: 403 });

    return NextResponse.json({ success: true, credential });
  } catch (error) {
    console.error("Error fetching credential:", error);
    return NextResponse.json({ error: "Failed to fetch credential" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { session, error } = await requireAnyRole(["PROVIDER"] as any);
    if (error) return error;

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });

    const provider = await prisma.provider.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!provider) return NextResponse.json({ error: "User is not registered as a provider" }, { status: 403 });

    const credential = await prisma.providerCredential.findUnique({ where: { id }, select: { id: true, providerId: true } });
    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (credential.providerId !== provider.id) return NextResponse.json({ error: "You do not have permission to update this credential" }, { status: 403 });

    const body = await request.json();
    const validationResult = credentialUpdateSchema.safeParse(body);
    if (!validationResult.success) return NextResponse.json({ error: "Invalid input", details: validationResult.error.format() }, { status: 400 });

    const { type, expiresAt, documentUrl, notes } = validationResult.data;
    const updates: any = {};
    if (type !== undefined) updates.type = type;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (documentUrl !== undefined) updates.documentUrl = documentUrl;
    if (notes !== undefined) updates.notes = notes;

    const updatedCredential = await prisma.providerCredential.update({ where: { id }, data: updates });
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
    const { session, error } = await requireAnyRole(["PROVIDER"] as any);
    if (error) return error;

    const { id } = params;
    if (!id) return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });

    const provider = await prisma.provider.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!provider) return NextResponse.json({ error: "User is not registered as a provider" }, { status: 403 });

    const credential = await prisma.providerCredential.findUnique({ where: { id }, select: { id: true, providerId: true } });
    if (!credential) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (credential.providerId !== provider.id) return NextResponse.json({ error: "You do not have permission to delete this credential" }, { status: 403 });

    await prisma.providerCredential.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting credential:", error);
    return NextResponse.json({ error: "Failed to delete credential" }, { status: 500 });
  }
}
