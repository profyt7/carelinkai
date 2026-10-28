import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// PATCH /api/bug-reports/[id] - Update bug report status (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }
    
    const body = await req.json().catch(() => ({}));
    
    const Schema = z.object({
      status: z.enum(["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
      assignedTo: z.string().optional().nullable(),
      adminNotes: z.string().optional().nullable(),
    });
    
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }
    
    const data = parsed.data;
    
    // Check if bug report exists
    const existing = await prisma.bugReport.findUnique({
      where: { id: params.id },
    });
    
    if (!existing) {
      return NextResponse.json(
        { error: "Bug report not found" },
        { status: 404 }
      );
    }
    
    // Update bug report
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.status) {
      updateData.status = data.status;
      
      // Set resolvedAt when status is RESOLVED or CLOSED
      if (data.status === "RESOLVED" || data.status === "CLOSED") {
        if (!existing.resolvedAt) {
          updateData.resolvedAt = new Date();
        }
      }
    }
    
    if (data.assignedTo !== undefined) {
      updateData.assignedTo = data.assignedTo;
    }
    
    if (data.adminNotes !== undefined) {
      updateData.adminNotes = data.adminNotes;
    }
    
    const updated = await prisma.bugReport.update({
      where: { id: params.id },
      data: updateData,
    });
    
    return NextResponse.json({ success: true, bugReport: updated });
  } catch (error) {
    console.error("Bug report update error:", error);
    return NextResponse.json(
      { error: "Failed to update bug report" },
      { status: 500 }
    );
  }
}

// GET /api/bug-reports/[id] - Get single bug report (admin only)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }
    
    const bugReport = await prisma.bugReport.findUnique({
      where: { id: params.id },
    });
    
    if (!bugReport) {
      return NextResponse.json(
        { error: "Bug report not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ bugReport });
  } catch (error) {
    console.error("Bug report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bug report" },
      { status: 500 }
    );
  }
}
