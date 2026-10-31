import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { submitSelfServeClaim } from '@/lib/claims/self-serve';

export const dynamic = 'force-dynamic';

/**
 * POST /api/homes/[id]/claim-request — a signed-in operator asks for an unclaimed listing (one click on the
 * listing). Files a PENDING_REVIEW claim for an admin to approve; ownership never moves here.
 * Rate-limited per operator and per IP.
 */
const STATUS: Record<string, number> = { not_operator: 403, home_not_found: 404, already_claimed: 409, pending_exists: 409 };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Sign in to claim this listing', reason: 'sign_in' }, { status: 401 });

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || 'unknown';
  const byUser = rateLimit({ name: 'home-claim:user', key: userId, limit: 5, windowMs: 60 * 60 * 1000 });
  const byIp = rateLimit({ name: 'home-claim:ip', key: ip, limit: 20, windowMs: 60 * 60 * 1000 });
  if (!byUser.allowed || !byIp.allowed) {
    return NextResponse.json({ error: 'Too many claim requests. Please try again later.', reason: 'rate_limited' }, { status: 429, headers: { 'Retry-After': String(Math.ceil(Math.max(byUser.resetMs, byIp.resetMs) / 1000)) } });
  }

  const { id } = await params;
  const result = await submitSelfServeClaim({ homeId: id, userId, source: 'listing_button' });
  if (!result.ok) return NextResponse.json({ error: result.reason, reason: result.reason }, { status: STATUS[result.reason] ?? 400 });
  return NextResponse.json({ ok: true, claimId: result.claimId, status: 'PENDING_REVIEW' }, { status: 201 });
}
