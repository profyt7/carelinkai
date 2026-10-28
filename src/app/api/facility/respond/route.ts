/**
 * POST /api/facility/respond  { token, action: 'accept' | 'decline', reason?, text? }
 *
 * Tokenized, no-login accept / decline for a shortlisted facility (sprint
 * W4-2). The signed token (claim-link pattern) authorizes ONE response for ONE
 * home on ONE concierge request; once answered, further posts get 409.
 * No PHI in or out: the facility only ever sees care level / payer / timeline.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { captureError } from '@/lib/sentry';
import { isDeclineReason } from '@/lib/concierge/facility-response';
import { applyFacilityResponse } from '@/lib/concierge/facility-response-engine';

export async function POST(request: NextRequest) {
  let body: { token?: unknown; action?: unknown; reason?: unknown; text?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token.trim() : '';
  const action = body.action === 'accept' || body.action === 'decline' ? body.action : null;
  if (!token || token.length > 1000 || !action) return NextResponse.json({ error: 'token and action are required' }, { status: 400 });
  if (action === 'decline' && !isDeclineReason(body.reason)) return NextResponse.json({ error: 'Pick a decline reason' }, { status: 400 });
  if (action === 'decline' && body.reason === 'OTHER' && !(typeof body.text === 'string' && body.text.trim().length >= 3)) {
    return NextResponse.json({ error: 'Please say why (a few words is fine)' }, { status: 400 });
  }
  try {
    const result = await applyFacilityResponse({
      token,
      action,
      reason: action === 'decline' && isDeclineReason(body.reason) ? body.reason : undefined,
      text: typeof body.text === 'string' ? body.text : undefined,
    });
    if (!result.ok) return NextResponse.json(result, { status: result.error === 'invalid' ? 404 : 409 });
    return NextResponse.json(result);
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'facility-response' } });
    return NextResponse.json({ error: 'Could not save your response. Please try again.' }, { status: 500 });
  }
}
