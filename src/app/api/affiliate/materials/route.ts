export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

/** GET /api/affiliate/materials — list active marketing materials for affiliates */
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAnyRole(["AFFILIATE", "ADMIN"] as any);
    if (error) return error;

    const category = request.nextUrl.searchParams.get("category") ?? undefined;

    const materials = await prisma.affiliateMaterial.findMany({
      where: { isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        fileUrl: true,
        fileType: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, materials });
  } catch (error) {
    console.error("[Affiliate Materials] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
  }
}
