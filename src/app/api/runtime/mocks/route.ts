 import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 1) Cookie takes precedence for runtime toggling
  const cookieRaw = req.cookies.get("carelink_mock_mode")?.value?.toString().trim().toLowerCase() || "";
  const cookieOn = ["1", "true", "yes", "on"].includes(cookieRaw);
  if (cookieOn) {
    return new NextResponse(JSON.stringify({ show: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // 2) Fallback to environment variables (robust to whitespace)
  const value = (
    process.env.SHOW_SITE_MOCKS ?? process.env.NEXT_PUBLIC_SHOW_MOCK_DASHBOARD ?? ""
  )
    .toString()
    .trim()
    .toLowerCase();
  const show = ["1", "true", "yes", "on"].includes(value);
  return new NextResponse(JSON.stringify({ show }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // ensure we always re-evaluate at request time
      "Cache-Control": "no-store",
    },
  });
}
