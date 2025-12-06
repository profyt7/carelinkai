import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAnyRole } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(2).max(140).optional().nullable(),
  bio: z.string().max(4000).optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  coverageCity: z.string().min(2).max(100).optional().nullable(),
  coverageState: z.string().min(2).max(100).optional().nullable(),
  coverageRadius: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .nullable(),
  serviceTypes: z.array(z.string()).optional(),
  // Provider can control marketplace visibility
  isVisibleInMarketplace: z.boolean().optional(),
});

async function getAllowedServiceSlugs(): Promise<Set<string>> {
  try {
    const rows = await (prisma as any).marketplaceCategory.findMany({
      where: { type: "SERVICE", isActive: true },
      select: { slug: true },
    });
    return new Set<string>(rows.map((r: any) => r.slug));
  } catch {
    // If categories table is unavailable, allow any strings (best-effort)
    return new Set<string>();
  }
}

export async function GET() {
  const { session, error } = await requireAnyRole([
    "PROVIDER" as UserRole,
  ]);
  if (error) return error;

  const userId = (session!.user as any).id as string;
  const provider = await (prisma as any).provider.findUnique({
    where: { userId },
    select: {
      id: true,
      name: true,
      bio: true,
      logoUrl: true,
      serviceTypes: true,
      coverageCity: true,
      coverageState: true,
      coverageRadius: true,
      isVisibleInMarketplace: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: provider });
}

export async function PATCH(request: Request) {
  const { session, error } = await requireAnyRole([
    "PROVIDER" as UserRole,
  ]);
  if (error) return error;

  const userId = (session!.user as any).id as string;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Validate serviceTypes against allowed slugs if available
  if (Array.isArray(data.serviceTypes)) {
    const allowed = await getAllowedServiceSlugs();
    if (allowed.size > 0) {
      const invalid = data.serviceTypes.filter((s) => !allowed.has(s));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: "Invalid serviceTypes", invalid },
          { status: 400 }
        );
      }
    }
  }

  const provider = await (prisma as any).provider.findUnique({ where: { userId }, select: { id: true } });
  if (!provider) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const updated = await (prisma as any).provider.update({
    where: { id: provider.id },
    data: {
      name: data.name ?? undefined,
      bio: data.bio ?? undefined,
      logoUrl: data.logoUrl ?? undefined,
      coverageCity: data.coverageCity ?? undefined,
      coverageState: data.coverageState ?? undefined,
      coverageRadius: data.coverageRadius ?? undefined,
      serviceTypes: Array.isArray(data.serviceTypes) ? data.serviceTypes : undefined,
      // Only providers themselves can toggle this here
      isVisibleInMarketplace: typeof data.isVisibleInMarketplace === 'boolean' ? data.isVisibleInMarketplace : undefined,
    },
    select: {
      id: true,
      name: true,
      bio: true,
      logoUrl: true,
      serviceTypes: true,
      coverageCity: true,
      coverageState: true,
      coverageRadius: true,
      isVisibleInMarketplace: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET, PATCH" } });
}

export function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET, PATCH" } });
}

export function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET, PATCH" } });
}
