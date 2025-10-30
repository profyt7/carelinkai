import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-db-simple";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json().catch(() => ({}));

    const event = body?.event || "unknown";
    const properties = body?.properties || {};

    const ip = request.headers.get("x-forwarded-for") || (request as any).ip || "unknown";

    console.log("analytics", { event, properties, ip, user: session?.user?.id });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error("Analytics track error", err);
    return NextResponse.json({ success: false }, { status: 200 });
  } finally {
  }
}
