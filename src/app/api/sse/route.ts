import { NextRequest, NextResponse } from 'next/server';
import { subscribe, sendHeartbeat } from '@/lib/server/sse';

// Configure route to use Node.js runtime and disable caching
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET handler for SSE connections
 * 
 * Accepts a comma-separated list of topics via the `topics` query parameter
 * Returns a stream of SSE events for those topics
 */
export async function GET(request: NextRequest) {
  // Parse topics from query parameters
  const topicsParam = request.nextUrl.searchParams.get('topics');
  
  // Return 400 if no topics provided
  if (!topicsParam) {
    return NextResponse.json(
      { error: 'Missing required query parameter: topics' },
      { status: 400 }
    );
  }
  
  // Parse comma-separated topics
  const topics = topicsParam.split(',').filter(Boolean);
  
  if (topics.length === 0) {
    return NextResponse.json(
      { error: 'No valid topics provided' },
      { status: 400 }
    );
  }

  // Create a new stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      console.log(`[SSE] New connection established for topics: ${topics.join(', ')}`);
      
      // Subscribe to the requested topics
      const subscription = subscribe(topics, controller);
      
      // Send initial comment line (for keep-alive)
      controller.enqueue(new TextEncoder().encode(": SSE connection established\n\n"));
      
      // Send ready event with subscribed topics
      controller.enqueue(
        new TextEncoder().encode(`event: ready\ndata: ${JSON.stringify({ topics })}\n\n`)
      );
      
      // Set up heartbeat interval (25 seconds)
      const heartbeatInterval = setInterval(() => {
        sendHeartbeat(controller);
      }, 25000);
      
      // Clean up on close
      return () => {
        console.log(`[SSE] Connection closed for topics: ${topics.join(', ')}`);
        clearInterval(heartbeatInterval);
        subscription.unsubscribe();
      };
    }
  });
  
  // Return the stream with appropriate headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

/**
 * OPTIONS handler for CORS preflight requests
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  });
}
