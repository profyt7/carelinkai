import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { requireOperatorOrAdmin } from "@/lib/rbac";

const prisma = new PrismaClient();

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
      select: { id: true, title: true, content: true, createdAt: true, createdBy: { select: { id: true, name: true, email: true } } },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("Notes list error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { session, error } = await requireOperatorOrAdmin();
    if (error) return error;
    const me = await prisma.user.findUnique({ where: { email: session!.user!.email! } });
    if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const { title, content } = body || {};
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });
    const created = await prisma.residentNote.create({ data: { residentId: params.id, title, content: content ?? null, createdByUserId: me.id }, select: { id: true } });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error("Notes create error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
