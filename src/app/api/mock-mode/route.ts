import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

function parseOnParam(v: string | null): boolean | null {
  if (!v) return null;
  const val = v.toString().trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(val)) return true;
  if (["0", "false", "no", "off"].includes(val)) return false;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    // Avoid build/prerender errors: during `next build` there is no request context for next-auth headers()
    if (process.env['NEXT_PHASE'] === "phase-production-build") {
      return NextResponse.json(
        { success: false, message: "Unavailable during build" },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    });

    if (!me) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    if (me.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { success: false, message: "Admin privilege required" },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const desired = parseOnParam(url.searchParams.get("on"));
    if (desired === null) {
      // If no explicit toggle provided, report current cookie state
      const currentRaw = req.cookies.get("carelink_mock_mode")?.value || "";
      const current = ["1", "true", "yes", "on"].includes(currentRaw.toLowerCase());
      return new NextResponse(JSON.stringify({ success: true, show: current }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    const res = NextResponse.json(
      { success: true, show: desired },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );

    const secure = process.env.NODE_ENV === "production";
    if (desired) {
      res.cookies.set("carelink_mock_mode", "1", {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    } else {
      res.cookies.set("carelink_mock_mode", "0", {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 0,
      });
    }

    return res;
  } catch (err: any) {
    // Reduce build noise: only log server errors outside of build phase
    if (process.env['NEXT_PHASE'] !== "phase-production-build" && process.env.NODE_ENV === "production") {
      console.error("mock-mode toggle error:", err);
    }
    return NextResponse.json(
      { success: false, message: "Failed to toggle mock mode" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
