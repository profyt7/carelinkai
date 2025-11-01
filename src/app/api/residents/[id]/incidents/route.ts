import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { requireOperatorOrAdmin } from "@/lib/rbac";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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
      select: { id: true, type: true, severity: true, description: true, occurredAt: true },
    });
    return NextResponse.json({ items });
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
    const Schema = z.object({ type: z.string().min(1), severity: z.string().min(1), description: z.string().optional(), occurredAt: z.string().datetime() });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const { type, severity, description, occurredAt } = parsed.data;
    const created = await prisma.residentIncident.create({ data: { residentId: params.id, type, severity, description: description ?? null, occurredAt: new Date(occurredAt) }, select: { id: true } });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'ResidentIncident', created.id, 'Created incident', { residentId: params.id, type, severity });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error("Incidents create error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    // noop
  }
}

