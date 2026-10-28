import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { requireOperatorOrAdmin } from "@/lib/rbac";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string, contactId: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ 
      name: z.string().min(1).optional(), 
      relationship: z.string().min(1).optional(),
      phone: z.string().optional().nullable(),
      email: z.string().email().optional().nullable(),
      address: z.string().optional().nullable(),
      isPrimaryContact: z.boolean().optional(),
      permissionLevel: z.string().optional(),
      contactPreference: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
      lastContactDate: z.string().datetime().optional().nullable()
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const updates: any = {};
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.relationship !== undefined) updates.relationship = parsed.data.relationship;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address;
    if (parsed.data.isPrimaryContact !== undefined) updates.isPrimaryContact = parsed.data.isPrimaryContact;
    if (parsed.data.permissionLevel !== undefined) updates.permissionLevel = parsed.data.permissionLevel;
    if (parsed.data.contactPreference !== undefined) updates.contactPreference = parsed.data.contactPreference;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
    if (parsed.data.lastContactDate !== undefined) updates.lastContactDate = parsed.data.lastContactDate ? new Date(parsed.data.lastContactDate) : null;
    await prisma.familyContact.update({ where: { id: params.contactId }, data: updates });
    await createAuditLogFromRequest(req, AuditAction.UPDATE, 'FamilyContact', params.contactId, 'Updated family contact', { residentId: params.id });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Family contact update error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string, contactId: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    await prisma.familyContact.delete({ where: { id: params.contactId } });
    await createAuditLogFromRequest(req, AuditAction.DELETE, 'FamilyContact', params.contactId, 'Deleted family contact', { residentId: params.id });
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Family contact delete error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
