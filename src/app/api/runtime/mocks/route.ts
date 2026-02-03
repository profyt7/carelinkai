
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // PRODUCTION: Mock mode is OFF by default for homes, but ON for marketplace
  // This allows real homes data while marketplace shows mock caregivers/jobs/providers
  
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
  
  // Marketplace mock mode: defaults to TRUE in production (since we don't have real caregivers yet)
  // Can be explicitly disabled via SHOW_MARKETPLACE_MOCKS=0 or cookie
  const marketplaceEnvValue = (process.env["SHOW_MARKETPLACE_MOCKS"] ?? "").toString().trim().toLowerCase();
  const marketplaceEnvExplicitlyDisabled = ["0", "false", "no", "off"].includes(marketplaceEnvValue);
  
  // Determine marketplace mock mode:
  // Priority: Cookie > Env var > Default (true for marketplace)
  let showMarketplace: boolean;
  if (marketplaceCookieOn) {
    showMarketplace = true;
  } else if (marketplaceCookieOff) {
    showMarketplace = false;
  } else if (marketplaceEnvExplicitlyDisabled) {
    showMarketplace = false;
  } else {
    // Default: marketplace mocks are ON (since we don't have real caregivers/jobs/providers yet)
    showMarketplace = true;
  }
  
  // If cookie explicitly sets general mock state, use that
  if (cookieOn) {
    console.log('[Mock Mode] Enabled via cookie (all)');
    return new NextResponse(JSON.stringify({ show: true, showMarketplace: true, source: 'cookie' }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
  
  if (cookieOff) {
    console.log('[Mock Mode] Disabled via cookie (homes only, marketplace may still use mocks)');
    return new NextResponse(JSON.stringify({ show: false, showMarketplace, source: 'cookie' }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  // In production, default to FALSE for homes unless explicitly enabled
  const show = isProduction ? envEnabled : envEnabled;
  
  console.log(`[Mock Mode] show=${show}, showMarketplace=${showMarketplace} (env=${envValue}, prod=${isProduction})`);
  
  return new NextResponse(JSON.stringify({ show, showMarketplace, source: 'env', isProduction }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
