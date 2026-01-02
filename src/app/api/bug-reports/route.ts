import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/bug-reports - Submit new bug report (available to all users)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    
    // Get session if user is logged in
    const session = await getServerSession(authOptions);
    
    const Schema = z.object({
      title: z.string().min(1, "Title is required"),
      description: z.string().min(10, "Description must be at least 10 characters"),
      stepsToReproduce: z.string().optional(),
      severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("MEDIUM"),
      pageUrl: z.string().min(1, "Page URL is required"),
      browserInfo: z.string().min(1, "Browser info is required"),
      deviceInfo: z.string().optional(),
      screenshotUrl: z.string().optional(),
      userEmail: z.string().email().optional(),
      userName: z.string().optional(),
    });
    
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.format() },
        { status: 400 }
      );
    }
    
    const data = parsed.data;
    
    // Determine user info
    const userId = session?.user?.id || null;
    const userEmail = data.userEmail || session?.user?.email || "anonymous@example.com";
    const userName = data.userName || 
      (session?.user ? `${session.user.firstName} ${session.user.lastName}` : "Anonymous User");
    const userType = session?.user?.role || null;
    
    // Create bug report
    const bugReport = await prisma.bugReport.create({
      data: {
        userId,
        userEmail,
        userName,
        userType,
        title: data.title,
        description: data.description,
        stepsToReproduce: data.stepsToReproduce || null,
        severity: data.severity,
        pageUrl: data.pageUrl,
        browserInfo: data.browserInfo,
        deviceInfo: data.deviceInfo || null,
        screenshotUrl: data.screenshotUrl || null,
        status: "NEW",
      },
    });
    
    // TODO: Send email notification to admin
    // For now, we'll just log it
    console.log("New bug report created:", bugReport.id);
    
    // Send success email notification (async, don't wait)
    sendBugReportEmail(bugReport).catch(console.error);
    
    return NextResponse.json(
      { success: true, id: bugReport.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Bug report creation error:", error);
    return NextResponse.json(
      { error: "Failed to create bug report" },
      { status: 500 }
    );
  }
}

// GET /api/bug-reports - Get all bug reports (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized. Admin access required." },
        { status: 403 }
      );
    }
    
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;
    const severity = url.searchParams.get("severity") || undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 100);
    const offset = Number(url.searchParams.get("offset") || "0");
    
    // Build where clause
    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }
    if (severity && severity !== "all") {
      where.severity = severity;
    }
    
    // Get bug reports
    const [bugReports, total] = await Promise.all([
      prisma.bugReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.bugReport.count({ where }),
    ]);
    
    return NextResponse.json({
      bugReports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Bug reports list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bug reports" },
      { status: 500 }
    );
  }
}

// Helper function to send email notification
async function sendBugReportEmail(bugReport: any) {
  try {
    // Import nodemailer or use existing email service
    // For now, just log
    console.log("Sending bug report email notification:", {
      to: "profyt7@gmail.com",
      subject: `🐛 New Bug Report: ${bugReport.title}`,
      bugId: bugReport.id,
      severity: bugReport.severity,
    });
    
    // TODO: Implement actual email sending
    // Example using fetch to a mail API or nodemailer
  } catch (error) {
    console.error("Failed to send bug report email:", error);
  }
}
