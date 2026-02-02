
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // PRODUCTION: Mock mode is OFF by default
  // Only enable if SHOW_SITE_MOCKS is explicitly set to "1" or cookie override
  
  // 1) Check cookie first (admin runtime toggle)
  const cookieRaw = req.cookies.get("carelink_mock_mode")?.value?.toString().trim().toLowerCase() || "";
  const cookieOn = ["1", "true", "yes", "on"].includes(cookieRaw);
  const cookieOff = ["0", "false", "no", "off"].includes(cookieRaw);
  
  // If cookie explicitly sets state, use that
  if (cookieOn) {
    console.log('[Mock Mode] Enabled via cookie');
    return new NextResponse(JSON.stringify({ show: true, source: 'cookie' }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  
  if (cookieOff) {
    console.log('[Mock Mode] Disabled via cookie');
    return new NextResponse(JSON.stringify({ show: false, source: 'cookie' }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // 2) Check environment variable (only SHOW_SITE_MOCKS for server-side control)
  const envValue = (process.env["SHOW_SITE_MOCKS"] ?? "")
    .toString()
    .trim()
    .toLowerCase();
  const envEnabled = ["1", "true", "yes", "on"].includes(envValue);
  
  // In production, default to FALSE unless explicitly enabled
  const show = isProduction ? envEnabled : envEnabled;
  
  console.log(`[Mock Mode] ${show ? 'Enabled' : 'Disabled'} (env=${envValue}, prod=${isProduction})`);
  
  return new NextResponse(JSON.stringify({ show, source: 'env', isProduction }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
