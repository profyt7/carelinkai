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

// prisma singleton

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Require permission to view assessments
    const user = await requirePermission(PERMISSIONS.ASSESSMENTS_VIEW);
    
    // Verify user has access to this resident
    await requireResidentAccess(user.id, params.id);
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);
    const items = await prisma.assessmentResult.findMany({
      where: { residentId: params.id },
      orderBy: { conductedAt: "desc" },
      take: limit,
      select: { 
        id: true, 
        type: true, 
        score: true, 
        data: true, 
        status: true,
        conductedBy: true,
        conductedAt: true,
        notes: true,
        recommendations: true,
        createdAt: true,
        updatedAt: true
      },
    });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error) {
    console.error("Assessments list error", error);
    return handleAuthError(error);
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Require permission to create assessments
    const user = await requirePermission(PERMISSIONS.ASSESSMENTS_CREATE);
    
    // Verify user has access to this resident
    await requireResidentAccess(user.id, params.id);
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ 
      type: z.string().min(1), 
      score: z.number().int().nullable().optional(), 
      data: z.any().optional(),
      status: z.string().optional(),
      conductedBy: z.string().optional(),
      conductedAt: z.string().datetime().optional(),
      notes: z.string().optional(),
      recommendations: z.string().optional()
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const { type, score, data, status, conductedBy, conductedAt, notes, recommendations } = parsed.data;
    const created = await prisma.assessmentResult.create({ 
      data: { 
        residentId: params.id, 
        type, 
        score: score ?? null, 
        data: data ?? null,
        status: status ?? null,
        conductedBy: conductedBy ?? null,
        conductedAt: conductedAt ? new Date(conductedAt) : new Date(),
        notes: notes ?? null,
        recommendations: recommendations ?? null
      }, 
      select: { id: true } 
    });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'AssessmentResult', created.id, 'Created assessment result', { residentId: params.id, type });
    return NextResponse.json({ success: true, id: created.id }, { status: 201, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error) {
    console.error("Assessments create error", error);
    return handleAuthError(error);
  }
}
