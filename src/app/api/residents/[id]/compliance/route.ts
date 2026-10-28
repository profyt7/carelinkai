import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  requirePermission,
  requireResidentAccess,
  handleAuthError,
} from "@/lib/auth-utils";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Require permission to view compliance
    const user = await requirePermission(PERMISSIONS.COMPLIANCE_VIEW);
    
    // Verify user has access to this resident
    await requireResidentAccess(user.id, params.id);
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);
    const items = await prisma.residentComplianceItem.findMany({
      where: { residentId: params.id },
      orderBy: { expiryDate: "asc" },
      take: limit,
      select: { 
        id: true, 
        type: true, 
        title: true,
        status: true,
        issuedDate: true,
        expiryDate: true,
        documentUrl: true,
        notes: true,
        verifiedBy: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true
      },
    });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error) {
    console.error("Compliance list error", error);
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Require permission to create compliance items
    const user = await requirePermission(PERMISSIONS.COMPLIANCE_CREATE);
    
    // Verify user has access to this resident
    await requireResidentAccess(user.id, params.id);
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ 
      type: z.string().min(1), 
      title: z.string().min(1),
      status: z.string().optional(),
      issuedDate: z.string().datetime().optional(),
      expiryDate: z.string().datetime().optional(),
      documentUrl: z.string().url().optional().nullable(),
      notes: z.string().optional().nullable(),
      verifiedBy: z.string().optional().nullable(),
      verifiedAt: z.string().datetime().optional().nullable()
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const { type, title, status, issuedDate, expiryDate, documentUrl, notes, verifiedBy, verifiedAt } = parsed.data;
    const created = await prisma.residentComplianceItem.create({ 
      data: { 
        residentId: params.id, 
        type, 
        title,
        status: status as any ?? 'CURRENT',
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        documentUrl: documentUrl ?? null,
        notes: notes ?? null,
        verifiedBy: verifiedBy ?? null,
        verifiedAt: verifiedAt ? new Date(verifiedAt) : null
      }, 
      select: { id: true } 
    });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'ResidentComplianceItem', created.id, 'Created compliance item', { residentId: params.id, type });
    return NextResponse.json({ success: true, id: created.id }, { status: 201, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error) {
    console.error("Compliance create error", error);
    return handleAuthError(error);
  }
}
