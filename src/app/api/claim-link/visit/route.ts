/**
 * POST /api/claim-link/visit (OL-117)
 *
 * Records a claim-link visit from the CLIENT-rendered register page (the
 * /claim server component records its own visits directly). Body:
 * { token, source }. The token is verified server-side — only a validly
 * signed claim token creates a row, so this can't be used to spam records.
 *
 * Always responds { ok: true }: the endpoint is deliberately NOT a
 * token-validity oracle, and a failed record must never affect the caller
 * (the register page fires this and forgets it).
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyClaimToken } from '@/lib/claim-token';
import { recordClaimLinkVisit } from '@/lib/claim-engine/claim-link-visit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';
    const source = body?.source === 'claim_page' ? 'claim_page' : 'register_page';

    if (token && token.length < 2048) {
      const payload = verifyClaimToken(token, process.env['NEXTAUTH_SECRET'] || '');
      if (payload?.homeId && payload.operatorEmail) {
        await recordClaimLinkVisit({
          homeId: payload.homeId,
          operatorEmail: payload.operatorEmail,
          source,
        });
      }
    }
  } catch {
    // Never surface errors — recording is best-effort by design.
  }
  return NextResponse.json({ ok: true });
}
