import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { requireOperatorOrAdmin } from "@/lib/rbac";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);
    const items = await prisma.familyContact.findMany({
      where: { residentId: params.id },
      orderBy: [{ isPrimaryContact: 'desc' }, { name: 'asc' }],
      take: limit,
      select: { 
        id: true, 
        name: true, 
        relationship: true,
        phone: true,
        email: true,
        address: true,
        isPrimaryContact: true,
        permissionLevel: true,
        contactPreference: true,
        notes: true,
        lastContactDate: true,
        createdAt: true,
        updatedAt: true
      },
    });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Family contacts list error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ 
      name: z.string().min(1), 
      relationship: z.string().min(1),
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
    const { name, relationship, phone, email, address, isPrimaryContact, permissionLevel, contactPreference, notes, lastContactDate } = parsed.data;
    const created = await prisma.familyContact.create({ 
      data: { 
        residentId: params.id, 
        name, 
        relationship,
        phone: phone ?? null,
        email: email ?? null,
        address: address ?? null,
        isPrimaryContact: isPrimaryContact ?? false,
        permissionLevel: permissionLevel ?? 'VIEW_ONLY',
        contactPreference: contactPreference ?? 'PHONE',
        notes: notes ?? null,
        lastContactDate: lastContactDate ? new Date(lastContactDate) : null
      }, 
      select: { id: true } 
    });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'FamilyContact', created.id, 'Created family contact', { residentId: params.id, name });
    return NextResponse.json({ success: true, id: created.id }, { status: 201, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Family contact create error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
