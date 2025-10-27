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
    const items = await prisma.assessmentResult.findMany({
      where: { residentId: params.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, type: true, score: true, data: true, createdAt: true },
    });
    return NextResponse.json({ items });
  } catch (e) {
    console.error("Assessments list error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error } = await requireOperatorOrAdmin();
    if (error) return error;
    const body = await req.json().catch(() => ({}));
    const { type, score, data } = body || {};
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
    const created = await prisma.assessmentResult.create({ data: { residentId: params.id, type, score: score ?? null, data: data ?? null }, select: { id: true } });
    return NextResponse.json({ success: true, id: created.id }, { status: 201 });
  } catch (e) {
    console.error("Assessments create error", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
