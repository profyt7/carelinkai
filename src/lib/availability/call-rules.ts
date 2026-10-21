/**
 * OL-163b/e — who the AI availability agent may call this cycle, and when it
 * may try again. Pure: the API route loads homes + their recent observations
 * and asks `callListDecision` for each.
 *
 * Rules (vault spec CC_Batch_OL163_Availability_Agent_2026_10_20):
 *   - due this cycle: every Cleveland listing + every home on the WRAAA waiver
 *     list, if it has an ODH business-line phone;
 *   - never: do_not_call (home flag or any observation), wrong_number;
 *   - declined → retry no sooner than 30 days; wants_human → a person handles
 *     it, the agent waits 30 days; no_answer → retry next cycle;
 *   - one attempt per home per week.
 * Call window Tue–Thu 10:00–11:30 and 14:00–16:00 ET is metadata for the batch
 * job (not enforced here).
 */

import type { CallOutcome, MedicaidWaiverStatus } from '@prisma/client';
import { toE164 } from '@/lib/availability/availability';

export const DECLINED_RETRY_DAYS = 30;
export const WANTS_HUMAN_RETRY_DAYS = 30;
const DAY_MS = 86_400_000;

export const CALL_WINDOW = {
  days: ['Tue', 'Wed', 'Thu'],
  slotsEt: ['10:00–11:30', '14:00–16:00'],
  timeZone: 'America/New_York',
} as const;

/** Homes on the WRAAA list (any participation state) are "waiver homes" for the cycle. */
export const WAIVER_LIST_STATUSES: readonly MedicaidWaiverStatus[] = ['ACCEPTING_NEW', 'CURRENT_RESIDENTS_ONLY', 'NOT_ACCEPTING_REFERRALS'];

export type CallWeek = { label: string; start: Date; end: Date };

/**
 * Monday-to-Monday UTC window for `week` ("2026-W43" ISO week, or any date in
 * the week, or empty for the current week).
 */
export function callWeek(week: string | null | undefined, now: Date = new Date()): CallWeek | null {
  let anchor: Date;
  const iso = /^(\d{4})-W(\d{2})$/.exec((week ?? '').trim());
  if (iso) {
    const year = Number(iso[1]);
    const w = Number(iso[2]);
    if (w < 1 || w > 53) return null;
    // ISO week 1 contains Jan 4th.
    const jan4 = new Date(Date.UTC(year, 0, 4));
    const jan4Dow = jan4.getUTCDay() || 7;
    const week1Monday = new Date(jan4.getTime() - (jan4Dow - 1) * DAY_MS);
    anchor = new Date(week1Monday.getTime() + (w - 1) * 7 * DAY_MS);
  } else if (week && week.trim()) {
    const d = new Date(week);
    if (Number.isNaN(d.getTime())) return null;
    anchor = d;
  } else {
    anchor = now;
  }
  const dow = anchor.getUTCDay() || 7;
  const start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate()) - (dow - 1) * DAY_MS);
  const end = new Date(start.getTime() + 7 * DAY_MS);
  return { label: isoWeekLabel(start), start, end };
}

export function isoWeekLabel(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow); // Thursday of this week decides the year
  const year = t.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export type CallCandidateHome = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  doNotCall: boolean;
  medicaidWaiverStatus: MedicaidWaiverStatus;
  /** Newest first; only outcome / calledAt / doNotCall are read. */
  observations: ReadonlyArray<{ outcome: CallOutcome; calledAt: Date | string; doNotCall: boolean }>;
};

export type ExcludeReason = 'do_not_call' | 'wrong_number' | 'declined_recently' | 'wants_human' | 'attempted_this_week' | 'no_phone';
export const EXCLUDE_REASONS: readonly ExcludeReason[] = ['do_not_call', 'wrong_number', 'declined_recently', 'wants_human', 'attempted_this_week', 'no_phone'];

export type CallListRow = { homeId: string; name: string; phone: string; city: string; reasons: Array<'directory' | 'waiver'> };

export type CallDecision = { include: true; row: CallListRow } | { include: false; reason: ExcludeReason };

export function callListDecision(home: CallCandidateHome, week: CallWeek, now: Date = new Date()): CallDecision {
  const obs = home.observations.map((o) => ({ ...o, at: new Date(o.calledAt).getTime() }));
  if (home.doNotCall || obs.some((o) => o.doNotCall)) return { include: false, reason: 'do_not_call' };
  if (obs.some((o) => o.outcome === 'WRONG_NUMBER')) return { include: false, reason: 'wrong_number' };
  const nowMs = now.getTime();
  if (obs.some((o) => o.outcome === 'DECLINED' && nowMs - o.at < DECLINED_RETRY_DAYS * DAY_MS)) return { include: false, reason: 'declined_recently' };
  if (obs.some((o) => o.outcome === 'WANTS_HUMAN' && nowMs - o.at < WANTS_HUMAN_RETRY_DAYS * DAY_MS)) return { include: false, reason: 'wants_human' };
  if (obs.some((o) => o.at >= week.start.getTime() && o.at < week.end.getTime())) return { include: false, reason: 'attempted_this_week' };
  const phone = toE164(home.phone);
  if (!phone) return { include: false, reason: 'no_phone' };
  const reasons: CallListRow['reasons'] = ['directory'];
  if (WAIVER_LIST_STATUSES.includes(home.medicaidWaiverStatus)) reasons.push('waiver');
  return { include: true, row: { homeId: home.id, name: home.name, phone, city: home.city ?? '', reasons } };
}

export function csvCell(v: string | number | boolean | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** The CSV the ElevenLabs batch-call job consumes: homeId, name, phone (E.164), city. */
export function callListCsv(rows: CallListRow[]): string {
  const header = ['homeId', 'name', 'phone', 'city'];
  return [header.join(','), ...rows.map((r) => [r.homeId, r.name, r.phone, r.city].map(csvCell).join(','))].join('\n') + '\n';
}

/** How many days until a declined / wants-human home may be called again (0 = now). */
export function retryAfterDays(outcome: CallOutcome, calledAt: Date | string, now: Date = new Date()): number {
  const days = outcome === 'DECLINED' ? DECLINED_RETRY_DAYS : outcome === 'WANTS_HUMAN' ? WANTS_HUMAN_RETRY_DAYS : 0;
  if (!days) return 0;
  const elapsed = (now.getTime() - new Date(calledAt).getTime()) / DAY_MS;
  return Math.max(0, Math.ceil(days - elapsed));
}
