/**
 * POST /api/admin/revalidate — purge the public hub pages on demand (OL-159).
 *
 * Auth: an admin session, OR `Authorization: Bearer <CRON_SECRET>` so the
 * post-deploy workflow and the waiver import script (Render shell) can call it.
 * Body (optional): { paths?: string[] } — only known hub paths or /homes/<id>
 * are accepted; anything else is ignored and reported. Default: every hub path.
 * Reads nothing from the DB, writes nothing; it only clears Next's route cache.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { checkCronAuth } from '@/lib/cron-auth';
import { hubRevalidatePaths, isRevalidatablePath } from '@/lib/seo/revalidate-paths';

async function authorized(request: NextRequest): Promise<'admin' | 'cron' | null> {
  if (checkCronAuth(request.headers).ok) return 'cron';
  try {
    await requireRole([UserRole.ADMIN]);
    return 'admin';
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const by = await authorized(request);
  if (!by) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { paths?: unknown };
  const requested = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === 'string') : null;
  const paths = requested ? requested.filter(isRevalidatablePath) : hubRevalidatePaths();
  const ignored = requested ? requested.filter((p) => !isRevalidatablePath(p)) : [];

  for (const p of paths) revalidatePath(p);
  return NextResponse.json(
    { ok: true, by, revalidated: paths, ignored, at: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
