import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { requireOperatorOrAdmin } from "@/lib/rbac";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Ensure no caching and dynamic execution in CI/SSR contexts
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);
    const items = await prisma.residentIncident.findMany({
      where: { residentId: params.id },
      orderBy: { occurredAt: "desc" },
      take: limit,
      select: { 
        id: true, 
        type: true, 
        severity: true, 
        status: true,
        description: true, 
        occurredAt: true,
        location: true,
        reportedBy: true,
        reportedAt: true,
        witnessedBy: true,
        actionsTaken: true,
        followUpRequired: true,
        resolutionNotes: true,
        resolvedAt: true,
        resolvedBy: true,
        createdAt: true,
        updatedAt: true
      },
    });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Incidents list error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    // noop
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ 
      type: z.string().min(1), 
      severity: z.string().min(1), 
      status: z.string().optional(),
      description: z.string().optional(), 
      occurredAt: z.string().datetime(),
      location: z.string().optional(),
      reportedBy: z.string().optional(),
      reportedAt: z.string().datetime().optional(),
      witnessedBy: z.string().optional(),
      actionsTaken: z.string().optional(),
      followUpRequired: z.boolean().optional(),
      resolutionNotes: z.string().optional(),
      resolvedAt: z.string().datetime().optional(),
      resolvedBy: z.string().optional()
    });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const { type, severity, status, description, occurredAt, location, reportedBy, reportedAt, witnessedBy, actionsTaken, followUpRequired, resolutionNotes, resolvedAt, resolvedBy } = parsed.data;
    const created = await prisma.residentIncident.create({ 
      data: { 
        residentId: params.id, 
        type, 
        severity, 
        status: status ?? 'REPORTED',
        description: description ?? null, 
        occurredAt: new Date(occurredAt),
        location: location ?? null,
        reportedBy: reportedBy ?? null,
        reportedAt: reportedAt ? new Date(reportedAt) : new Date(),
        witnessedBy: witnessedBy ?? null,
        actionsTaken: actionsTaken ?? null,
        followUpRequired: followUpRequired ?? false,
        resolutionNotes: resolutionNotes ?? null,
        resolvedAt: resolvedAt ? new Date(resolvedAt) : null,
        resolvedBy: resolvedBy ?? null
      }, 
      select: { id: true } 
    });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'ResidentIncident', created.id, 'Created incident', { residentId: params.id, type, severity });
    return NextResponse.json({ success: true, id: created.id }, { status: 201, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Incidents create error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    // noop
  }
}

