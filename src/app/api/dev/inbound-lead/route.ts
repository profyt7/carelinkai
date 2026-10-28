export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { recordInboundLead, type ParsedInboundLead } from '@/lib/leads/inbound-lead';

/**
 * DEV-ONLY (ALLOW_DEV_ENDPOINTS=1): seed an inbound lead without the
 * ElevenLabs webhook secret so /admin/inbound-leads can be driven in e2e.
 * Goes through the same recordInboundLead() as the webhook. Sends nothing.
 *
 *   POST   { conversationId, callerType?, name?, organization?, callbackPhone?, urgency?, reason? }
 *          → { ok, result }
 *   DELETE { conversationIdPrefix }  → removes what a spec seeded
 */
export async function POST(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : '';
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  const str = (k: string): string | null => (typeof body?.[k] === 'string' && body[k].trim() ? body[k].trim() : null);
  const callerType = (['planner', 'family', 'facility', 'other'] as const).find((c) => c === body?.callerType) ?? 'planner';
  const urgency = (['today', 'this_week', 'planning'] as const).find((u) => u === body?.urgency) ?? 'today';
  const parsed: ParsedInboundLead = {
    conversationId,
    agentId: null,
    callerType,
    name: str('name') ?? 'E2E Planner',
    organization: str('organization') ?? 'E2E Hospital',
    callbackPhone: str('callbackPhone') ?? '+12165550100',
    fromNumber: str('fromNumber') ?? '+12165550100',
    urgency,
    reason: str('reason') ?? 'needs a bed this week',
    phiFlag: false,
    transcriptUrl: `https://elevenlabs.io/app/conversational-ai/history/${conversationId}`,
    recordingUrl: `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}/audio`,
    receivedAt: new Date(),
    afterHours: body?.afterHours === true,
    facility: { bedsAvailable: null, startingPrice: null, medicaidWaiver: null },
  };
  try {
    const result = await recordInboundLead(parsed);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (process.env['ALLOW_DEV_ENDPOINTS'] !== '1') return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const prefix = typeof body?.conversationIdPrefix === 'string' ? body.conversationIdPrefix : '';
  if (!prefix) return NextResponse.json({ error: 'conversationIdPrefix required' }, { status: 400 });
  const r = await prisma.inboundLead.deleteMany({ where: { conversationId: { startsWith: prefix } } });
  return NextResponse.json({ ok: true, deleted: r.count });
}
