/**
 * Admin "Acceptance (from calls)" (sprint W5-2, G3 + G4). ADMIN-only.
 *
 * GET  → current waiver status + acceptance facts (each with source + verifiedAt)
 *        and the public view the listing will render.
 * POST → set any of: medicaidWaiverStatus (override), medicaidPendingAccepted,
 *        acuityCeiling, admissionsCrm. `source` is VA_CALL or ADMIN; verifiedAt
 *        is now. Each changed field writes one EntityEvent (HOME /
 *        acceptance.updated) in the same transaction as the update.
 *
 * Business facts only — no PHI anywhere in this route.
 */

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { recordEvent } from '@/lib/events/record-event';
import {
  ACUITY_KEYS,
  MEDICAID_WAIVER_STATUSES,
  medicaidWaiverPublicView,
  normalizeAcuityCeiling,
} from '@/lib/medicaid/waiver';

const ACCEPTANCE_SELECT = {
  id: true,
  name: true,
  medicaidWaiverStatus: true,
  medicaidWaiverSource: true,
  medicaidWaiverVerifiedAt: true,
  medicaidPendingAccepted: true,
  medicaidPendingAcceptedSource: true,
  medicaidPendingAcceptedVerifiedAt: true,
  acuityCeiling: true,
  acuityCeilingSource: true,
  acuityCeilingVerifiedAt: true,
  admissionsCrm: true,
  admissionsCrmSource: true,
  admissionsCrmVerifiedAt: true,
} as const;

const triState = z.union([z.boolean(), z.null()]);

const postSchema = z.object({
  source: z.enum(['VA_CALL', 'ADMIN']),
  medicaidWaiverStatus: z.enum(MEDICAID_WAIVER_STATUSES as unknown as [string, ...string[]]).optional(),
  medicaidPendingAccepted: triState.optional(),
  acuityCeiling: z
    .object(Object.fromEntries(ACUITY_KEYS.map((k) => [k, triState.optional()])) as Record<(typeof ACUITY_KEYS)[number], z.ZodOptional<typeof triState>>)
    .optional(),
  admissionsCrm: z.union([z.string().trim().max(80), z.null()]).optional(),
});

function present(home: NonNullable<Awaited<ReturnType<typeof load>>>) {
  return {
    home: { id: home.id, name: home.name },
    acceptance: {
      medicaidWaiverStatus: home.medicaidWaiverStatus,
      medicaidWaiverSource: home.medicaidWaiverSource,
      medicaidWaiverVerifiedAt: home.medicaidWaiverVerifiedAt,
      medicaidPendingAccepted: home.medicaidPendingAccepted,
      medicaidPendingAcceptedSource: home.medicaidPendingAcceptedSource,
      medicaidPendingAcceptedVerifiedAt: home.medicaidPendingAcceptedVerifiedAt,
      acuityCeiling: normalizeAcuityCeiling(home.acuityCeiling),
      acuityCeilingSource: home.acuityCeilingSource,
      acuityCeilingVerifiedAt: home.acuityCeilingVerifiedAt,
      admissionsCrm: home.admissionsCrm,
      admissionsCrmSource: home.admissionsCrmSource,
      admissionsCrmVerifiedAt: home.admissionsCrmVerifiedAt,
    },
    view: medicaidWaiverPublicView(home),
  };
}

function load(id: string) {
  return prisma.assistedLivingHome.findUnique({ where: { id }, select: ACCEPTANCE_SELECT });
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    await requireRole([UserRole.ADMIN]);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const home = await load(id);
  if (!home) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(present(home));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> | { id: string } }) {
  let admin: { id: string; role: string };
  try {
    admin = (await requireRole([UserRole.ADMIN])) as { id: string; role: string };
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id } = await params;
  const existing = await load(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const parsed = postSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;
  const source = body.source;
  const now = new Date();
  const actor = { userId: admin.id, role: 'ADMIN' };

  const data: Record<string, unknown> = {};
  const events: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];

  if (body.medicaidWaiverStatus !== undefined && body.medicaidWaiverStatus !== existing.medicaidWaiverStatus) {
    data['medicaidWaiverStatus'] = body.medicaidWaiverStatus;
    data['medicaidWaiverSource'] = source;
    data['medicaidWaiverVerifiedAt'] = now;
    events.push({
      field: 'medicaidWaiverStatus',
      oldValue: { medicaidWaiverStatus: existing.medicaidWaiverStatus, source: existing.medicaidWaiverSource },
      newValue: { medicaidWaiverStatus: body.medicaidWaiverStatus, source, verifiedAt: now },
    });
  }
  if (body.medicaidPendingAccepted !== undefined && body.medicaidPendingAccepted !== existing.medicaidPendingAccepted) {
    data['medicaidPendingAccepted'] = body.medicaidPendingAccepted;
    data['medicaidPendingAcceptedSource'] = source;
    data['medicaidPendingAcceptedVerifiedAt'] = now;
    events.push({
      field: 'medicaidPendingAccepted',
      oldValue: { medicaidPendingAccepted: existing.medicaidPendingAccepted },
      newValue: { medicaidPendingAccepted: body.medicaidPendingAccepted, source, verifiedAt: now },
    });
  }
  if (body.acuityCeiling !== undefined) {
    const next = normalizeAcuityCeiling({ ...normalizeAcuityCeiling(existing.acuityCeiling), ...body.acuityCeiling });
    const prev = normalizeAcuityCeiling(existing.acuityCeiling);
    if (JSON.stringify(next) !== JSON.stringify(prev)) {
      data['acuityCeiling'] = next;
      data['acuityCeilingSource'] = source;
      data['acuityCeilingVerifiedAt'] = now;
      events.push({ field: 'acuityCeiling', oldValue: { acuityCeiling: prev }, newValue: { acuityCeiling: next, source, verifiedAt: now } });
    }
  }
  if (body.admissionsCrm !== undefined) {
    const next = body.admissionsCrm === null || body.admissionsCrm === '' ? null : body.admissionsCrm;
    if (next !== existing.admissionsCrm) {
      data['admissionsCrm'] = next;
      data['admissionsCrmSource'] = source;
      data['admissionsCrmVerifiedAt'] = now;
      events.push({ field: 'admissionsCrm', oldValue: { admissionsCrm: existing.admissionsCrm }, newValue: { admissionsCrm: next, source, verifiedAt: now } });
    }
  }

  if (events.length === 0) {
    return NextResponse.json({ ok: true, changed: 0, ...present(existing) });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.assistedLivingHome.update({ where: { id }, data, select: ACCEPTANCE_SELECT });
    for (const e of events) {
      await recordEvent(tx, {
        entityType: 'HOME',
        entityId: id,
        eventType: 'acceptance.updated',
        field: e.field,
        oldValue: e.oldValue,
        newValue: e.newValue,
        source,
        actor,
        occurredAt: now,
      });
    }
    return row;
  });

  return NextResponse.json({ ok: true, changed: events.length, ...present(updated) });
}
