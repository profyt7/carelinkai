import { NextRequest, NextResponse } from "next/server";
import { AuditAction } from "@prisma/client";
import { requireOperatorOrAdmin } from "@/lib/rbac";
import { createAuditLogFromRequest } from "@/lib/audit";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// prisma singleton

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "25"), 100);
    const items = await prisma.assessmentResult.findMany({
      where: { residentId: params.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, score: true, data: true, createdAt: true },
    });
    return NextResponse.json({ items }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Assessments list error", e);
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
    const Schema = z.object({ type: z.string().min(1), score: z.number().int().nullable().optional(), data: z.any().optional() });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const { type, score, data } = parsed.data;
    const created = await prisma.assessmentResult.create({ data: { residentId: params.id, type, score: score ?? null, data: data ?? null }, select: { id: true } });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'AssessmentResult', created.id, 'Created assessment result', { residentId: params.id, type });
    return NextResponse.json({ success: true, id: created.id }, { status: 201, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (e) {
    console.error("Assessments create error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    // noop
  }
}
