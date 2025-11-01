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
    const items = await prisma.residentNote.findMany({
      where: { residentId: params.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        content: true,
        visibility: true,
        createdAt: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("Notes list error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    // noop
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const Schema = z.object({ content: z.string().min(1), visibility: z.enum(["INTERNAL","CARE_TEAM","FAMILY"]).optional() });
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid body", details: parsed.error.format() }, { status: 400 });
    const { content, visibility } = parsed.data as any;
    const allowed = new Set(["INTERNAL", "CARE_TEAM", "FAMILY"]);
    const data: any = { residentId: params.id, content, createdByUserId: me.id };
    if (visibility && allowed.has(String(visibility))) {
      data.visibility = visibility;
    }
    const created = await prisma.residentNote.create({ data, select: { id: true } });
    await createAuditLogFromRequest(req, AuditAction.CREATE, 'ResidentNote', created.id, 'Created resident note', { residentId: params.id, visibility: data.visibility || 'INTERNAL' });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error("Notes create error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    // noop
  }
}
