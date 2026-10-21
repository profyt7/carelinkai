/**
 * Admin side of inbound leads (OL-167c): the list behind /admin/inbound-leads,
 * the two status actions (Mark contacted / Close) and the per-day PLANNER
 * count that feeds the concierge metrics page.
 *
 * Status is derived from timestamps and the enum is kept in step so either
 * can be filtered on:  NEW → contactedAt set ⇒ CONTACTED → closedAt set ⇒ CLOSED.
 * Closing an un-contacted lead leaves contactedAt null (we did not reach them).
 */

import type { InboundCallerType, InboundLeadStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const CALLER_TYPE_FILTERS = ['PLANNER', 'FAMILY', 'FACILITY', 'OTHER'] as const;
export const STATUS_FILTERS = ['NEW', 'CONTACTED', 'CLOSED'] as const;
export const LEAD_ACTIONS = ['contacted', 'close'] as const;
export type LeadAction = (typeof LEAD_ACTIONS)[number];

export type StatusFilter = InboundLeadStatus | 'OPEN' | 'ALL';
export type CallerTypeFilter = InboundCallerType | 'ALL';

export function parseStatusFilter(raw: string | null | undefined): StatusFilter | null {
  const v = (raw ?? 'open').toUpperCase();
  if (v === 'OPEN' || v === 'ALL') return v;
  return (STATUS_FILTERS as readonly string[]).includes(v) ? (v as InboundLeadStatus) : null;
}

export function parseCallerTypeFilter(raw: string | null | undefined): CallerTypeFilter | null {
  const v = (raw ?? 'all').toUpperCase();
  if (v === 'ALL') return 'ALL';
  return (CALLER_TYPE_FILTERS as readonly string[]).includes(v) ? (v as InboundCallerType) : null;
}

export function leadWhere(status: StatusFilter, callerType: CallerTypeFilter): Prisma.InboundLeadWhereInput {
  const where: Prisma.InboundLeadWhereInput = {};
  if (status === 'OPEN') where.status = { in: ['NEW', 'CONTACTED'] };
  else if (status !== 'ALL') where.status = status;
  if (callerType !== 'ALL') where.callerType = callerType;
  return where;
}

export const LEAD_SELECT = {
  id: true,
  conversationId: true,
  callerType: true,
  name: true,
  organization: true,
  callbackPhone: true,
  urgency: true,
  reason: true,
  transcriptUrl: true,
  recordingUrl: true,
  afterHours: true,
  status: true,
  receivedAt: true,
  contactedAt: true,
  closedAt: true,
  phiFlag: true,
} satisfies Prisma.InboundLeadSelect;

export type InboundLeadRow = Prisma.InboundLeadGetPayload<{ select: typeof LEAD_SELECT }>;

export async function listInboundLeads(opts: { status: StatusFilter; callerType: CallerTypeFilter; limit?: number }) {
  const take = Math.min(Math.max(opts.limit ?? 200, 1), 500);
  const [rows, grouped] = await Promise.all([
    prisma.inboundLead.findMany({ where: leadWhere(opts.status, opts.callerType), select: LEAD_SELECT, orderBy: { receivedAt: 'desc' }, take }),
    prisma.inboundLead.groupBy({ by: ['status'], _count: { _all: true } }),
  ]);
  const counts: Record<string, number> = { new: 0, contacted: 0, closed: 0 };
  for (const g of grouped) counts[g.status.toLowerCase()] = g._count._all;
  return { rows, counts };
}

/** Next state for an action, or null when the action does not apply. Pure. */
export function nextLeadState(
  lead: { status: InboundLeadStatus; contactedAt: Date | null; closedAt: Date | null },
  action: LeadAction,
  now: Date = new Date(),
): { status: InboundLeadStatus; contactedAt?: Date; closedAt?: Date } | null {
  if (action === 'contacted') {
    if (lead.status !== 'NEW') return null;
    return { status: 'CONTACTED', contactedAt: now };
  }
  if (lead.status === 'CLOSED') return null;
  return { status: 'CLOSED', closedAt: now };
}

export type ApplyLeadActionResult = { ok: true; lead: InboundLeadRow } | { ok: false; error: 'not_found' | 'not_applicable' };

export async function applyLeadAction(id: string, action: LeadAction, now: Date = new Date()): Promise<ApplyLeadActionResult> {
  const lead = await prisma.inboundLead.findUnique({ where: { id }, select: { status: true, contactedAt: true, closedAt: true } });
  if (!lead) return { ok: false, error: 'not_found' };
  const next = nextLeadState(lead, action, now);
  if (!next) return { ok: false, error: 'not_applicable' };
  const updated = await prisma.inboundLead.update({ where: { id }, data: next, select: LEAD_SELECT });
  return { ok: true, lead: updated };
}

// ---------------------------------------------------------------------------
// Daily PLANNER lead count (concierge metrics / CMO source) — pure part lives
// in inbound-lead-daily.ts; this is the loader.
// ---------------------------------------------------------------------------

export { plannerLeadsPerDay, toBusinessDay, type DailyCount } from '@/lib/leads/inbound-lead-daily';

export async function loadPlannerLeadDates(now: Date = new Date(), days = 14): Promise<Date[]> {
  const since = new Date(now.getTime() - (days + 1) * 86_400_000);
  const rows = await prisma.inboundLead.findMany({ where: { callerType: 'PLANNER', receivedAt: { gte: since } }, select: { receivedAt: true } });
  return rows.map((r) => r.receivedAt);
}
