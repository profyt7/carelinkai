import { NextRequest, NextResponse } from 'next/server';

/**
 * Sentry Tunnel Endpoint
 * 
 * This endpoint proxies Sentry events from the SDK to Sentry's ingest endpoint.
 * It's recommended by Sentry to bypass network restrictions, ad blockers, and firewalls.
 * 
 * How it works:
 * 1. Sentry SDK sends events to /api/sentry-tunnel instead of directly to Sentry
 * 2. This endpoint validates the DSN and forwards the event to Sentry's ingest
 * 3. Returns Sentry's response to the SDK
 * 
 * Security:
 * - Validates DSN matches configured project DSN
 * - Only forwards to configured Sentry project
 * - Prevents abuse by unauthorized parties
 */

// Configure allowed DSN (from environment)
const SENTRY_DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const SENTRY_HOST = 'o4510119703216128.ingest.us.sentry.io';
const SENTRY_PROJECT_ID = '4510154426089472';

export async function POST(request: NextRequest) {
  try {
    // Read the envelope from the request body
    const envelope = await request.text();
    
    console.log('[Sentry Tunnel] Received event envelope');
    
    // Validate DSN is configured
    if (!SENTRY_DSN) {
      console.error('[Sentry Tunnel] ❌ SENTRY_DSN not configured');
      return NextResponse.json(
        { error: 'Sentry DSN not configured' },
        { status: 500 }
      );
    }
    
    // Parse the envelope to extract DSN from header
    const envelopeLines = envelope.split('\n');
    if (envelopeLines.length < 1) {
      console.error('[Sentry Tunnel] ❌ Invalid envelope format');
      return NextResponse.json(
        { error: 'Invalid envelope format' },
        { status: 400 }
      );
    }
    
    // First line is the envelope header (JSON)
    let envelopeHeader;
    try {
      envelopeHeader = JSON.parse(envelopeLines[0]);
    } catch (error) {
      console.error('[Sentry Tunnel] ❌ Failed to parse envelope header:', error);
      return NextResponse.json(
        { error: 'Invalid envelope header' },
        { status: 400 }
      );
    }
    
    // Extract DSN from envelope header
    const envelopeDsn = envelopeHeader?.dsn;
    if (!envelopeDsn) {
      console.error('[Sentry Tunnel] ❌ No DSN in envelope header');
      return NextResponse.json(
        { error: 'No DSN in envelope' },
        { status: 400 }
      );
    }
    
    console.log('[Sentry Tunnel] Envelope DSN:', envelopeDsn);
    
    // Validate DSN matches configured DSN (security check)
    if (!SENTRY_DSN.includes(envelopeDsn.split('@')[0].split('//')[1])) {
      console.error('[Sentry Tunnel] ❌ DSN mismatch - rejecting event');
      return NextResponse.json(
        { error: 'Invalid DSN' },
        { status: 403 }
      );
    }
    
    // Construct Sentry ingest URL
    const sentryIngestUrl = `https://${SENTRY_HOST}/api/${SENTRY_PROJECT_ID}/envelope/`;
    
    console.log('[Sentry Tunnel] Forwarding to:', sentryIngestUrl);
    
    // Extract public key from DSN for authentication
    // DSN format: https://<public_key>@<host>/<project_id>
    const publicKey = SENTRY_DSN.split('@')[0].split('//')[1];
    
    // Build X-Sentry-Auth header
    const sentryAuth = [
      `Sentry sentry_version=7`,
      `sentry_key=${publicKey}`,
      `sentry_client=sentry.javascript.nextjs/10.32.1`,
    ].join(', ');
    
    console.log('[Sentry Tunnel] Using public key:', publicKey);
    
    // Forward the envelope to Sentry with proper authentication
    const sentryResponse = await fetch(sentryIngestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': sentryAuth,
      },
      body: envelope,
    });
    
    // Log the response
    const responseText = await sentryResponse.text();
    console.log('[Sentry Tunnel] Sentry response status:', sentryResponse.status);
    console.log('[Sentry Tunnel] Sentry response:', responseText);
    
    // Check if Sentry accepted the event
    if (sentryResponse.ok) {
      console.log('[Sentry Tunnel] ✅ Event forwarded successfully');
    } else {
      console.error('[Sentry Tunnel] ❌ Sentry rejected event:', sentryResponse.status, responseText);
    }
    
    // Return Sentry's response to the SDK
    return new NextResponse(responseText, {
      status: sentryResponse.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('[Sentry Tunnel] ❌ Error processing request:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Sentry tunnel is operational',
    configured: !!SENTRY_DSN,
    host: SENTRY_HOST,
    projectId: SENTRY_PROJECT_ID,
  });
}
