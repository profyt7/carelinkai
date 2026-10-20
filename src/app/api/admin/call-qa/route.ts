/**
 * /api/admin/call-qa — QA queue for AI availability-call observations (OL-163c).
 * Admin only; anything else → 403.
 *
 *   GET  ?status=pending|approved|corrected|rejected|all&limit=   → { rows, counts }
 *   POST { id, action: approve|correct|reject|do_not_call, corrections?, note? }
 *        → { ok, observation, applied, skipped }
 * Approve / Correct are the ONLY path from a call to the home's public
 * availability (verifiedAt = calledAt, source AI_CALL).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { QA_ACTIONS, applyQaAction, listObservations } from '@/lib/availability/call-qa';

const STATUSES = ['PENDING', 'APPROVED', 'CORRECTED', 'REJECTED'] as const;
const nullableInt = z.union([z.number().int().min(0).max(999_999), z.null()]).optional();

const postSchema = z.object({
  id: z.string().min(1),
  action: z.enum(QA_ACTIONS),
  note: z.string().max(500).optional().nullable(),
  corrections: z
    .object({
      outcome: z.enum(['ANSWERED', 'DECLINED', 'NO_ANSWER', 'WANTS_HUMAN', 'WRONG_NUMBER']).optional(),
      bedsAL: nullableInt,
      bedsMC: nullableInt,
      priceFromMonthly: nullableInt,
      priceUndisclosed: z.union([z.boolean(), z.null()]).optional(),
      waiverStatus: z.union([z.enum(['ACCEPTING_NEW', 'CURRENT_ONLY', 'NO', 'UNKNOWN']), z.null()]).optional(),
      medicaidPending: z.union([z.enum(['YES', 'NO', 'CASE_BY_CASE', 'UNKNOWN']), z.null()]).optional(),
      contactRole: z.union([z.string().trim().max(80), z.null()]).optional(),
      doNotCall: z.boolean().optional(),
    })
    .optional(),
});

async function admin(): Promise<{ id: string; role: string } | null> {
  try {
    return (await requireRole([UserRole.ADMIN])) as { id: string; role: string };
  } catch {
    return null;
  }
}
const forbidden = () => NextResponse.json({ error: 'Forbidden' }, { status: 403 });
const noStore = { headers: { 'cache-control': 'no-store' } };

export async function GET(request: NextRequest) {
  if (!(await admin())) return forbidden();
  const raw = (request.nextUrl.searchParams.get('status') ?? 'pending').toUpperCase();
  const status = raw === 'ALL' ? 'all' : (STATUSES as readonly string[]).includes(raw) ? (raw as (typeof STATUSES)[number]) : null;
  if (!status) return NextResponse.json({ error: 'status must be pending|approved|corrected|rejected|all' }, { status: 400 });
  const limit = Number.parseInt(request.nextUrl.searchParams.get('limit') ?? '100', 10);
  try {
    const [rows, grouped] = await Promise.all([
      listObservations({ status, limit: Number.isFinite(limit) ? limit : 100 }),
      prisma.availabilityObservation.groupBy({ by: ['qaStatus'], _count: { _all: true } }),
    ]);
    const counts = Object.fromEntries(STATUSES.map((s) => [s.toLowerCase(), 0])) as Record<string, number>;
    for (const g of grouped) counts[g.qaStatus.toLowerCase()] = g._count._all;
    return NextResponse.json({ rows, counts, generatedAt: new Date().toISOString() }, noStore);
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'admin/call-qa GET' } });
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await admin();
  if (!user) return forbidden();
  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  try {
    const result = await applyQaAction({
      id: parsed.data.id,
      action: parsed.data.action,
      corrections: parsed.data.corrections,
      note: parsed.data.note ?? null,
      actor: { userId: user.id, role: 'ADMIN' },
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.error === 'not_found' ? 404 : 409 });
    return NextResponse.json(result, noStore);
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { route: 'admin/call-qa POST' } });
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 });
  }
}
