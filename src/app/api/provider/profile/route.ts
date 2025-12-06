import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, UserRole, AuditAction, CategoryType } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";
import { z } from "zod";

const prisma = new PrismaClient();

const providerPatchSchema = z.object({
  name: z.string().min(2).max(200).optional().nullable(),
  bio: z.string().max(5000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  serviceTypes: z.array(z.string()).max(50).optional(),
  coverageCity: z.string().max(120).optional().nullable(),
  coverageState: z.string().max(2).optional().nullable(),
  coverageRadius: z.number().int().min(1).max(500).optional().nullable(),
  isVisibleInMarketplace: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
    }
    if ((session.user as any).role !== "PROVIDER") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const provider = await prisma.provider.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
        name: true,
        bio: true,
        logoUrl: true,
        serviceTypes: true,
        coverageCity: true,
        coverageState: true,
        coverageRadius: true,
        isVisibleInMarketplace: true,
        isVerified: true,
        verifiedBy: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!provider) {
      return NextResponse.json({ success: false, message: "Provider profile not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: provider });
  } catch (err: any) {
    console.error("[provider.profile.GET]", err);
    return NextResponse.json({ success: false, message: "Failed to load provider profile" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
    }
    if ((session.user as any).role !== "PROVIDER") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const json = await request.json();
    const parsed = providerPatchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid input", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const data = parsed.data as any;

    // Sanitize service types to known SERVICE category slugs
    let cleanServices: string[] | undefined = undefined;
    if (Array.isArray(data.serviceTypes)) {
      const cats = await prisma.marketplaceCategory.findMany({ where: { type: CategoryType.SERVICE, isActive: true }, select: { slug: true } });
      const allowed = new Set(cats.map(c => c.slug));
      cleanServices = Array.from(new Set((data.serviceTypes as string[]).map(s => String(s).trim().toLowerCase()))).filter(s => allowed.has(s));
    }

    const updated = await prisma.provider.update({
      where: { userId: session.user.id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.bio !== undefined ? { bio: data.bio } : {}),
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(cleanServices !== undefined ? { serviceTypes: cleanServices } : {}),
        ...(data.coverageCity !== undefined ? { coverageCity: data.coverageCity } : {}),
        ...(data.coverageState !== undefined ? { coverageState: data.coverageState } : {}),
        ...(data.coverageRadius !== undefined ? { coverageRadius: data.coverageRadius } : {}),
        ...(data.isVisibleInMarketplace !== undefined ? { isVisibleInMarketplace: !!data.isVisibleInMarketplace } : {}),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        bio: true,
        logoUrl: true,
        serviceTypes: true,
        coverageCity: true,
        coverageState: true,
        coverageRadius: true,
        isVisibleInMarketplace: true,
        isVerified: true,
        verifiedBy: true,
        verifiedAt: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    await prisma.auditLog.create({
      data: {
        action: AuditAction.UPDATE,
        resourceType: "PROVIDER",
        resourceId: updated.id,
        description: "Provider updated profile",
        ipAddress: request.headers.get("x-forwarded-for") || (request as any).ip || "unknown",
        userId: session.user.id,
        actionedBy: session.user.id,
        metadata: { updated: Object.keys(parsed.data) }
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error("[provider.profile.PATCH]", err);
    return NextResponse.json({ success: false, message: "Failed to update provider profile" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
