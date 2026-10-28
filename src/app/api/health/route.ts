import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const startedAt = Date.now();
  let db = 'unknown' as 'ok' | 'degraded' | 'failed' | 'unknown';

  try {
    // Lightweight DB ping
    await prisma.$queryRaw`SELECT 1`;
    db = 'ok';
  } catch (e) {
    console.error('health: db check failed', e);
    db = 'degraded';
  }

  const durationMs = Date.now() - startedAt;
  return NextResponse.json(
    {
      ok: db === 'ok',
      db,
      uptimeSec: Math.floor(process.uptime()),
      durationMs,
      env: process.env.NODE_ENV,
    },
    { status: 200 }
  );
}
