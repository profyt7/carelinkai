export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/rbac";

/**
 * GET /api/admin/provider-credentials
 * Lists ProviderCredentials across all providers.
 * Query params:
 *   status — filter by status (PENDING | VERIFIED | REJECTED | EXPIRED | ALL), default: PENDING
 *   page   — 1-indexed page number, default: 1
 *   limit  — results per page, default: 50
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAnyRole(["ADMIN" as any]);
  if (error) return error;
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const statusParam = (searchParams.get("status") ?? "PENDING").toUpperCase();
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
  const skip = (page - 1) * limit;

  const whereStatus: any =
    statusParam === "ALL"
      ? {}
      : { status: statusParam };

  const [credentials, total] = await Promise.all([
    prisma.providerCredential.findMany({
      where: whereStatus,
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
      include: {
        provider: {
          select: {
            id: true,
            businessName: true,
            contactEmail: true,
            contactName: true,
            isVerified: true,
          },
        },
      },
    }),
    prisma.providerCredential.count({ where: whereStatus }),
  ]);

  return NextResponse.json({ credentials, total, page, limit });
}
