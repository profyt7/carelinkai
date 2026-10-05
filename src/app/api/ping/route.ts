/**
 * GET /api/ping — the endpoint uptime pollers and the Render health check
 * should hit.
 *
 * Deliberately trivial: no Prisma, no session, no React render, no imports
 * beyond the Web Response. /api/health stays for the DB-aware check
 * ({ok, db, uptimeSec, durationMs, env}); this one only proves the process is
 * accepting requests. Both paths are excluded from Sentry tracing
 * (src/lib/sentry/trace-sampling.ts).
 *
 * Render dashboard → Settings → Health Check Path: /api/ping
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const HEADERS = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
  'x-robots-tag': 'noindex',
};

export function GET() {
  return new Response(JSON.stringify({ ok: true, uptimeSec: Math.floor(process.uptime()) }), {
    status: 200,
    headers: HEADERS,
  });
}

export function HEAD() {
  return new Response(null, { status: 200, headers: HEADERS });
}
