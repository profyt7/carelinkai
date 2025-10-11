 import { NextResponse } from "next/server";

export async function GET() {
  const raw = (process.env.SHOW_SITE_MOCKS || process.env.NEXT_PUBLIC_SHOW_MOCK_DASHBOARD || "").toString().toLowerCase();
  const show = ["1", "true", "yes", "on"].includes(raw);
  return new NextResponse(JSON.stringify({ show }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      // ensure we always re-evaluate at request time
      "Cache-Control": "no-store",
    },
  });
}
