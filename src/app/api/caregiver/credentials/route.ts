
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

﻿import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const credentialCreateSchema = z.object({
  type: z.string().min(1, "Type is required").max(100),
  issueDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Issue date must be a valid date in ISO format" }),
  expirationDate: z.string().refine(val => !isNaN(Date.parse(val)), { message: "Expiration date must be a valid date in ISO format" }),
  documentUrl: z.string().url().optional(),
}).refine(data => new Date(data.expirationDate) > new Date(data.issueDate), { message: "Expiration date must be after issue date", path: ["expirationDate"] });

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (isNaN(page) || page < 1) return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 });
    if (isNaN(limit) || limit < 1 || limit > 100) return NextResponse.json({ error: "Invalid limit parameter" }, { status: 400 });

    const caregiver = await prisma.caregiver.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!caregiver) return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });

    const skip = (page - 1) * limit;
    const [credentials, total] = await Promise.all([
      prisma.credential.findMany({ where: { caregiverId: caregiver.id }, orderBy: { createdAt: "desc" }, skip, take: limit, select: { id: true, type: true, documentUrl: true, issueDate: true, expirationDate: true, isVerified: true, verifiedAt: true, createdAt: true, updatedAt: true } }),
      prisma.credential.count({ where: { caregiverId: caregiver.id } })
    ]);

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({ credentials, pagination: { total, page, limit, totalPages, hasMore } });
  } catch (error) {
    console.error("Error fetching credentials:", error);
    return NextResponse.json({ error: "Failed to fetch credentials" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["CAREGIVER"] as any);
    if (error) return error;

    const body = await request.json();
    const validationResult = credentialCreateSchema.safeParse(body);
    if (!validationResult.success) return NextResponse.json({ error: "Invalid input", details: validationResult.error.format() }, { status: 400 });

    const { type, issueDate, expirationDate, documentUrl } = validationResult.data;

    const caregiver = await prisma.caregiver.findUnique({ where: { userId: session!.user!.id! }, select: { id: true } });
    if (!caregiver) return NextResponse.json({ error: "User is not registered as a caregiver" }, { status: 403 });

    const credential = await prisma.credential.create({ data: { caregiverId: caregiver.id, type, issueDate: new Date(issueDate), expirationDate: new Date(expirationDate), documentUrl, isVerified: false } });

    return NextResponse.json({ success: true, credential });
  } catch (error) {
    console.error("Error creating credential:", error);
    return NextResponse.json({ error: "Failed to create credential" }, { status: 500 });
  }
}
