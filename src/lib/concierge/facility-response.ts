/**
 * Facility accept / decline — PURE helpers (sprint W4-2). No DB, no network.
 *
 *  - fixed decline reasons (+ which ones are acuity flags);
 *  - the signed, expiring response-link token (claim-link pattern: HMAC over a
 *    base64url payload with NEXTAUTH_SECRET) — single-use is enforced in the
 *    engine by the row's status, the token only identifies ONE home × request;
 *  - `buildFacilitySummary`: the PHI-MINIMAL summary a facility sees (care
 *    level, payer lane, timeline). It never copies patientInfo through —
 *    name / age / diagnosis / notes stay in-app;
 *  - `renderFacilityResponseEmail`: the email (CAN-SPAM footer);
 *  - `rollupObservedCriteria`: decline reasons → the home's "acceptance
 *    criteria (observed)" JSON. A separate column, so operator-entered
 *    fields are never overwritten.
 */

import crypto from 'crypto';
import type { FacilityDeclineReason } from '@prisma/client';
import { deriveFeeLane, isPayerSource, PAYER_SOURCE_LABELS, type FeeLane } from '@/lib/payer/payer-source';

export const FACILITY_RESPONSE_TTL_DAYS = 30;

export const DECLINE_REASONS: ReadonlyArray<{ value: FacilityDeclineReason; label: string; acuity: boolean }> = [
  { value: 'NO_BED', label: 'No bed available', acuity: false },
  { value: 'ACUITY_TWO_PERSON_ASSIST', label: 'Acuity too high — two-person assist', acuity: true },
  { value: 'ACUITY_WANDERING', label: 'Acuity too high — wandering / elopement risk', acuity: true },
  { value: 'ACUITY_OXYGEN', label: 'Acuity too high — oxygen', acuity: true },
  { value: 'ACUITY_INSULIN', label: 'Acuity too high — insulin management', acuity: true },
  { value: 'ACUITY_BARIATRIC', label: 'Acuity too high — bariatric', acuity: true },
  { value: 'ACUITY_BEHAVIORAL', label: 'Acuity too high — behavioral', acuity: true },
  { value: 'ACUITY_HOSPICE', label: 'Acuity too high — hospice', acuity: true },
  { value: 'PAYER_NOT_ACCEPTED', label: 'Payer not accepted', acuity: false },
  { value: 'MEDICAID_PENDING_NOT_ACCEPTED', label: 'Medicaid-pending not accepted', acuity: false },
  { value: 'OUTSIDE_AREA', label: 'Outside our service area', acuity: false },
  { value: 'OTHER', label: 'Other (please say why)', acuity: false },
];
export const DECLINE_REASON_LABELS: Record<FacilityDeclineReason, string> = Object.fromEntries(
  DECLINE_REASONS.map((r) => [r.value, r.label])
) as Record<FacilityDeclineReason, string>;
export function isDeclineReason(v: unknown): v is FacilityDeclineReason {
  return typeof v === 'string' && DECLINE_REASONS.some((r) => r.value === v);
}

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export interface FacilityResponseTokenPayload {
  responseId: string;
  searchId: string;
  homeId: string;
  type: 'facility_response';
  iat: number;
  exp: number;
}
const b64 = (s: string) => Buffer.from(s).toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf-8');
const hmac = (d: string, secret: string) => crypto.createHmac('sha256', secret).update(d).digest('base64url');

export function signFacilityResponseToken(
  p: Pick<FacilityResponseTokenPayload, 'responseId' | 'searchId' | 'homeId'>,
  secret: string,
  now: number = Date.now(),
  ttlDays: number = FACILITY_RESPONSE_TTL_DAYS
): string {
  const iat = Math.floor(now / 1000);
  const payload: FacilityResponseTokenPayload = { ...p, type: 'facility_response', iat, exp: iat + ttlDays * 86_400 };
  const data = b64(JSON.stringify(payload));
  return `${data}.${hmac(data, secret)}`;
}

export function verifyFacilityResponseToken(token: string, secret: string, now: number = Date.now()): FacilityResponseTokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts as [string, string];
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'base64url'), Buffer.from(hmac(data, secret), 'base64url'))) return null;
    const payload = JSON.parse(unb64(data)) as FacilityResponseTokenPayload;
    if (payload.type !== 'facility_response' || !payload.responseId || !payload.homeId || !payload.searchId) return null;
    if (payload.exp && Math.floor(now / 1000) > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// PHI-minimal summary
// ---------------------------------------------------------------------------

export type FacilitySummary = {
  /** e.g. "Memory care" — a care LEVEL, never a diagnosis. */
  careLevel: string;
  /** e.g. "Private pay / long-term care insurance" */
  payerLane: string;
  feeLane: FeeLane;
  /** e.g. "urgent" / "within 2 weeks" / "Not specified" */
  timeline: string;
};

const CARE_LEVEL_LABEL: Record<string, string> = {
  INDEPENDENT: 'Independent living',
  ASSISTED: 'Assisted living',
  MEMORY_CARE: 'Memory care',
  SKILLED_NURSING: 'Skilled nursing',
};

function careLevelFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (/memory|dementia|alzheimer|secured|wander/.test(t)) return 'Memory care';
  if (/skilled|rehab|wound|snf|nursing home/.test(t)) return 'Skilled nursing';
  if (/independent/.test(t)) return 'Independent living';
  if (/assisted/.test(t)) return 'Assisted living';
  return null;
}

/**
 * Only three facts leave the app. `patientInfo` is read for the TIMELINE and
 * for a care-level keyword only (dementia → "Memory care"); the raw text is
 * never returned.
 */
export function buildFacilitySummary(input: {
  parsedCriteria?: unknown;
  patientInfo?: unknown;
  payerSource?: unknown;
  queryText?: string | null;
}): FacilitySummary {
  const pc = (input.parsedCriteria && typeof input.parsedCriteria === 'object' ? input.parsedCriteria : {}) as Record<string, unknown>;
  const pi = (input.patientInfo && typeof input.patientInfo === 'object' ? input.patientInfo : {}) as Record<string, unknown>;

  let careLevel: string | null = null;
  const pcLevel = pc['careLevel'] ?? pc['careType'] ?? (Array.isArray(pc['careTypes']) ? (pc['careTypes'] as unknown[])[0] : undefined);
  if (typeof pcLevel === 'string') careLevel = CARE_LEVEL_LABEL[pcLevel.toUpperCase()] ?? careLevelFromText(pcLevel);
  if (!careLevel && typeof pi['medicalNeeds'] === 'string') careLevel = careLevelFromText(pi['medicalNeeds'] as string);
  if (!careLevel && input.queryText) careLevel = careLevelFromText(input.queryText);
  careLevel = careLevel ?? 'Assisted living';

  let payerLane: string;
  const feeLane = deriveFeeLane(isPayerSource(input.payerSource) ? input.payerSource : null);
  if (isPayerSource(input.payerSource)) payerLane = PAYER_SOURCE_LABELS[input.payerSource];
  else {
    const pt = typeof pi['paymentType'] === 'string' ? (pi['paymentType'] as string).toLowerCase() : '';
    payerLane = /medicaid/.test(pt) ? 'Medicaid' : /medicare/.test(pt) ? 'Medicare' : /va|veteran/.test(pt) ? 'VA benefits' : /private|self|ltc|insurance/.test(pt) ? 'Private pay' : 'Not specified';
  }

  const timelineRaw = typeof pi['timeline'] === 'string' ? (pi['timeline'] as string).trim() : '';
  const timeline = timelineRaw ? timelineRaw.slice(0, 60) : 'Not specified';

  return { careLevel, payerLane, feeLane, timeline };
}

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function facilityResponseUrl(appUrl: string, token: string): string {
  return `${appUrl}/facility/respond?token=${encodeURIComponent(token)}`;
}

export function renderFacilityResponseEmail(i: {
  facilityName: string;
  summary: FacilitySummary;
  appUrl: string;
  token: string;
  postalAddress: string;
  unsubscribeUrl: string;
  dpOrganization?: string | null;
}): { subject: string; text: string; html: string } {
  const url = facilityResponseUrl(i.appUrl, i.token);
  const from = i.dpOrganization ? `a discharge planner at ${i.dpOrganization}` : 'a hospital discharge planner';
  const lines = [
    `Care level: ${i.summary.careLevel}`,
    `Payer: ${i.summary.payerLane}`,
    `Timeline: ${i.summary.timeline}`,
  ];
  const subject = `Placement inquiry for ${i.facilityName} — can you accept? (${i.summary.careLevel}, ${i.summary.payerLane})`;
  const text =
    `Hello ${i.facilityName},\n\n` +
    `${from[0].toUpperCase()}${from.slice(1)} is placing a patient through CareLinkAI and shortlisted your community.\n\n` +
    lines.map((l) => `  ${l}`).join('\n') +
    `\n\nCan you accept this placement? One tap, no login:\n${url}\n\n` +
    `Accept, or decline with a reason (no bed, acuity, payer, area) so we stop sending you placements that do not fit. ` +
    `No resident details are in this email — they are shared in the app only after you accept.\n\n` +
    `CareLinkAI · ${i.postalAddress}\n` +
    `Unsubscribe from placement inquiries: ${i.unsubscribeUrl}\n`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.55;font-size:15px">
  <p style="margin:0 0 14px">Hello ${escapeHtml(i.facilityName)},</p>
  <p style="margin:0 0 14px">${escapeHtml(from[0].toUpperCase() + from.slice(1))} is placing a patient through CareLinkAI and shortlisted your community.</p>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px;font-size:15px">
    ${lines.map((l) => { const [k, v] = l.split(': '); return `<tr><td style="padding:2px 12px 2px 0;color:#6b7280">${escapeHtml(k ?? '')}</td><td style="padding:2px 0;font-weight:600">${escapeHtml(v ?? '')}</td></tr>`; }).join('')}
  </table>
  <p style="margin:0 0 16px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Accept or decline — one tap, no login</a></p>
  <p style="margin:0 0 14px;color:#6b7280;font-size:13px">Decline with a reason (no bed, acuity, payer, area) and we stop sending you placements that do not fit. No resident details are in this email &mdash; they are shared in the app only after you accept.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0"/>
  <p style="color:#9ca3af;font-size:12px;line-height:1.5">
    CareLinkAI &middot; ${escapeHtml(i.postalAddress)}<br/>
    <a href="${escapeHtml(i.unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe</a> &mdash; you won't receive placement inquiries again.
  </p>
</body></html>`;
  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Observed acceptance criteria roll-up
// ---------------------------------------------------------------------------

export type ObservedCriteria = {
  version: 1;
  declines: Partial<Record<FacilityDeclineReason, { count: number; lastAt: string }>>;
  totalDeclines: number;
  totalAccepts: number;
  lastDeclinedAt: string | null;
  lastAcceptedAt: string | null;
};

export function emptyObservedCriteria(): ObservedCriteria {
  return { version: 1, declines: {}, totalDeclines: 0, totalAccepts: 0, lastDeclinedAt: null, lastAcceptedAt: null };
}

function coerce(existing: unknown): ObservedCriteria {
  if (!existing || typeof existing !== 'object') return emptyObservedCriteria();
  const e = existing as Partial<ObservedCriteria>;
  return {
    version: 1,
    declines: e.declines && typeof e.declines === 'object' ? { ...e.declines } : {},
    totalDeclines: typeof e.totalDeclines === 'number' ? e.totalDeclines : 0,
    totalAccepts: typeof e.totalAccepts === 'number' ? e.totalAccepts : 0,
    lastDeclinedAt: typeof e.lastDeclinedAt === 'string' ? e.lastDeclinedAt : null,
    lastAcceptedAt: typeof e.lastAcceptedAt === 'string' ? e.lastAcceptedAt : null,
  };
}

/** Pure: merge one decline into the observed criteria. Never touches anything else. */
export function rollupObservedCriteria(existing: unknown, reason: FacilityDeclineReason, at: Date): ObservedCriteria {
  const c = coerce(existing);
  const prev = c.declines[reason];
  c.declines[reason] = { count: (prev?.count ?? 0) + 1, lastAt: at.toISOString() };
  c.totalDeclines += 1;
  c.lastDeclinedAt = at.toISOString();
  return c;
}

export function rollupObservedAccept(existing: unknown, at: Date): ObservedCriteria {
  const c = coerce(existing);
  c.totalAccepts += 1;
  c.lastAcceptedAt = at.toISOString();
  return c;
}

/** Human line for the operator profile: "Declined 2× for wandering, 1× no bed". */
export function describeObservedCriteria(existing: unknown): string[] {
  const c = coerce(existing);
  return (Object.entries(c.declines) as Array<[FacilityDeclineReason, { count: number; lastAt: string }]>)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([reason, v]) => `${DECLINE_REASON_LABELS[reason]} — ${v.count}× (last ${v.lastAt.slice(0, 10)})`);
}
