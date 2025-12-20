
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

﻿import { NextRequest, NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Basic preferences shape; all fields optional
const PreferencesSchema = z.object({
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      sms: z.boolean().optional(),
    })
    .optional(),
  offsets: z.array(z.number().positive()).optional(),
}).partial();

function deepMerge<T extends Record<string, any>>(target: T, source: T): T {
  if (target == null || source == null || typeof target !== "object" || typeof source !== "object" || Array.isArray(target) || Array.isArray(source)) {
    return source as T;
  }
  const result: Record<string, any> = { ...target };
  for (const key of Object.keys(source)) {
    if (key in target) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result as T;
}

// GET: retrieve operator preferences
export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["OPERATOR" as UserRole]);
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
    }

    const userId = session.user.id;
    const operator = await prisma.operator.findUnique({
      where: { userId },
      select: { id: true, companyName: true, user: { select: { preferences: true } } },
    });
    if (!operator) {
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        preferences: operator.user.preferences || {},
        operatorId: operator.id,
        companyName: operator.companyName,
      },
    });
  } catch (error: any) {
    console.error("Operator preferences retrieval error:", error);
    return NextResponse.json({ success: false, message: "Failed to retrieve operator preferences", error: process.env['NODE_ENV'] === "development" ? error.message : undefined }, { status: 500 });
  }
}

// PUT: update operator preferences
export async function PUT(request: NextRequest) {
  try {
    const { session, error } = await requireAnyRole(["OPERATOR" as UserRole]);
    if (error) return error;
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, message: "Authentication required" }, { status: 401 });
    }

    const userId = session.user.id;
    const operator = await prisma.operator.findUnique({ where: { userId }, select: { id: true, user: { select: { preferences: true } } } });
    if (!operator) {
      return NextResponse.json({ success: false, message: "Operator not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = PreferencesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Invalid request data", details: parsed.error.format() }, { status: 400 });
    }

    const current = (operator.user.preferences as any) || {};
    const incoming = parsed.data as any;
    const merged = deepMerge(current, incoming);

    await prisma.user.update({ where: { id: userId }, data: { preferences: merged } });

    return NextResponse.json({ success: true, data: { preferences: merged, operatorId: operator.id } });
  } catch (error: any) {
    console.error("Operator preferences update error:", error);
    return NextResponse.json({ success: false, message: "Failed to update operator preferences", error: process.env['NODE_ENV'] === "development" ? error.message : undefined }, { status: 500 });
  }
}