
// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";

/**
 * Simple network test endpoint for PWA connectivity checks
 * Used by the offline page to determine when connectivity is restored
 */
export async function GET(request: NextRequest) {
  // Get current timestamp for debugging
  const timestamp = new Date().toISOString();
  
  // Return minimal response with timestamp
  return NextResponse.json(
    { 
      status: "online", 
      timestamp,
      success: true
    },
    { 
      status: 200,
      headers: {
        // Set cache control headers to prevent caching
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      }
    }
  );
}
