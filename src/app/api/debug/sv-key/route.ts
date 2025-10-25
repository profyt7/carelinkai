import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

// Mirror send-verification limiter settings
const MAX_VERIFICATION_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const verifyLimiter = rateLimit({
  interval: RATE_LIMIT_WINDOW_MS,
  limit: MAX_VERIFICATION_ATTEMPTS,
  uniqueTokenPerInterval: 5000,
});

export async function GET(request: NextRequest) {
  // Optional gate (enable by setting DEBUG_SV_ROUTE=1)
  if (process.env["DEBUG_SV_ROUTE"] !== "1") {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const xff = request.headers.get("x-forwarded-for") || "";
  const xri = request.headers.get("x-real-ip") || "";
  const clientIp = (xff.split(",")[0]?.trim()) || xri || "unknown";
  const rateLimitKey = "sv:" + clientIp;

  const usage = await verifyLimiter.getUsage(rateLimitKey);

  return NextResponse.json({
    ok: true,
    clientIp,
    xff,
    xri,
    rateLimitKey,
    usage,
  });
}
