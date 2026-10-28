import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { requireOperatorOrAdmin } from "@/lib/rbac";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string, complianceId: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ 
      type: z.string().min(1).optional(), 
      title: z.string().min(1).optional(),
      status: z.string().optional(),
      issuedDate: z.string().datetime().optional().nullable(),
      expiryDate: z.string().datetime().optional().nullable(),
      documentUrl: z.string().url().optional().nullable(),
      notes: z.string().optional().nullable(),
      verifiedBy: z.string().optional().nullable(),
      verifiedAt: z.string().datetime().optional().nullable()
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const updates: any = {};
    if (parsed.data.type !== undefined) updates.type = parsed.data.type;
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.issuedDate !== undefined) updates.issuedDate = parsed.data.issuedDate ? new Date(parsed.data.issuedDate) : null;
    if (parsed.data.expiryDate !== undefined) updates.expiryDate = parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null;
    if (parsed.data.documentUrl !== undefined) updates.documentUrl = parsed.data.documentUrl;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.verifiedBy !== undefined) updates.verifiedBy = parsed.data.verifiedBy;
    if (parsed.data.verifiedAt !== undefined) updates.verifiedAt = parsed.data.verifiedAt ? new Date(parsed.data.verifiedAt) : null;
    await prisma.residentComplianceItem.update({ where: { id: params.complianceId }, data: updates });
    await createAuditLogFromRequest(req, AuditAction.UPDATE, 'ResidentComplianceItem', params.complianceId, 'Updated compliance item', { residentId: params.id });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Compliance update error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string, complianceId: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    await prisma.residentComplianceItem.delete({ where: { id: params.complianceId } });
    await createAuditLogFromRequest(req, AuditAction.DELETE, 'ResidentComplianceItem', params.complianceId, 'Deleted compliance item', { residentId: params.id });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Compliance delete error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
