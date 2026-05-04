
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';

  // 1) Check cookie first (admin runtime toggle)
  const cookieRaw = req.cookies.get("carelink_mock_mode")?.value?.toString().trim().toLowerCase() || "";
  const cookieOn = ["1", "true", "yes", "on"].includes(cookieRaw);
  const cookieOff = ["0", "false", "no", "off"].includes(cookieRaw);

  // Marketplace-specific cookie
  const marketplaceCookieRaw = req.cookies.get("carelink_marketplace_mock")?.value?.toString().trim().toLowerCase() || "";
  const marketplaceCookieOn = ["1", "true", "yes", "on"].includes(marketplaceCookieRaw);
  const marketplaceCookieOff = ["0", "false", "no", "off"].includes(marketplaceCookieRaw);

  // Check environment variables
  const envValue = (process.env["SHOW_SITE_MOCKS"] ?? "").toString().trim().toLowerCase();
  const envEnabled = ["1", "true", "yes", "on"].includes(envValue);

  const marketplaceEnvValue = (process.env["SHOW_MARKETPLACE_MOCKS"] ?? "").toString().trim().toLowerCase();
  const marketplaceEnvEnabled = ["1", "true", "yes", "on"].includes(marketplaceEnvValue);

  // Determine marketplace mock mode:
  // Priority: general cookie > marketplace cookie > env var > default (OFF in production, ON in dev)
  let showMarketplace: boolean;
  if (cookieOn) {
    showMarketplace = true;
  } else if (cookieOff) {
    // Admin explicitly disabled — also kills marketplace mocks
    showMarketplace = false;
  } else if (marketplaceCookieOn) {
    showMarketplace = true;
  } else if (marketplaceCookieOff) {
    showMarketplace = false;
  } else if (marketplaceEnvEnabled) {
    showMarketplace = true;
  } else {
    // Default: OFF in production (real data is live), ON in development
    showMarketplace = !isProduction;
  }

  const show = cookieOn ? true : cookieOff ? false : envEnabled;

  console.log(`[Mock Mode] show=${show}, showMarketplace=${showMarketplace} (env=${envValue}, prod=${isProduction})`);

  return new NextResponse(JSON.stringify({ show, showMarketplace, source: cookieOn || cookieOff ? 'cookie' : 'env', isProduction }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
