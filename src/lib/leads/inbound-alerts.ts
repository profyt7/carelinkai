/**
 * OL-167b — alerts for inbound front-desk calls. Fire-and-forget AFTER the DB
 * write. Every caller type emails ADMIN_NOTIFY_EMAIL (Resend):
 *
 *   PLANNER         → SMS to ADMIN_NOTIFY_MOBILE (existing Twilio client) +
 *                     email
 *   FAMILY / OTHER  → email only
 *   FACILITY        → email only: "Facility callback: {name}, {facility},
 *                     {phone}" + openings / starting price / Medicaid + a link
 *                     to the QA item (matched home) or the leads page
 *                     (unmatched). The QA observation is still written.
 *
 * SMS stays planner-only (A2P campaign pending). Subjects start with the
 * caller type ("[Facility] Pleasant Pointe called back") for filtering. No
 * alert carries the reason or transcript text; the SMS is the one line
 * "CareLinkAI planner callback: {name}, {org}, {phone}, {urgency}". Failures
 * are logged and reported, never thrown: the webhook already answered 200
 * and the row is in the table.
 */

import type { InboundCallerType, InboundLeadUrgency } from '@prisma/client';
import { captureError } from '@/lib/sentry';
import { guardedResendSend } from '@/lib/email';
import { smsService } from '@/lib/sms/sms-service';

export type FacilityFacts = {
  bedsAvailable: number | null;
  startingPrice: number | null;
  medicaidWaiver: 'accepting_new' | 'current_only' | 'no' | 'unknown' | null;
};

export type InboundAlertInput = {
  leadId: string;
  callerType: InboundCallerType;
  name: string | null;
  organization: string | null;
  callbackPhone: string;
  urgency: InboundLeadUrgency | null;
  afterHours: boolean;
  phiFlag: boolean;
  transcriptUrl: string | null;
  recordingUrl: string | null;
  receivedAt: Date;
  /** FACILITY only — what the community reported. */
  facility?: FacilityFacts | null;
};

export type InboundAlertResult = { sms: 'sent' | 'failed' | 'skipped'; email: 'sent' | 'failed' | 'skipped' };

const URGENCY_LABEL: Record<InboundLeadUrgency, string> = { TODAY: 'today', THIS_WEEK: 'this week', PLANNING: 'planning' };
const TYPE_LABEL: Record<InboundCallerType, string> = { PLANNER: 'planner', FAMILY: 'family', FACILITY: 'facility', OTHER: 'caller' };
const SUBJECT_TAG: Record<InboundCallerType, string> = { PLANNER: '[Planner]', FAMILY: '[Family]', FACILITY: '[Facility]', OTHER: '[Other]' };
const WAIVER_LABEL: Record<NonNullable<FacilityFacts['medicaidWaiver']>, string> = {
  accepting_new: 'accepting new residents',
  current_only: 'current residents only',
  no: 'no',
  unknown: 'unknown',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The one line both channels share. No reason, no transcript text. */
export function alertLine(lead: Pick<InboundAlertInput, 'callerType' | 'name' | 'organization' | 'callbackPhone' | 'urgency'>): string {
  const who = TYPE_LABEL[lead.callerType];
  return `CareLinkAI ${who} callback: ${lead.name ?? 'name not given'}, ${lead.organization ?? 'no org'}, ${lead.callbackPhone}, ${lead.urgency ? URGENCY_LABEL[lead.urgency] : 'urgency not given'}`;
}

/** Every caller type emails; only planners also get the SMS. */
export function alertChannels(callerType: InboundCallerType): { sms: boolean; email: boolean } {
  return { sms: callerType === 'PLANNER', email: true };
}

/** "[Planner] Pat Example (MetroHealth) called back" — caller type first so it filters. */
export function alertSubject(callerType: InboundCallerType, who: string | null, org: string | null): string {
  const name = who ?? org ?? 'Caller';
  return `${SUBJECT_TAG[callerType]} ${name}${who && org ? ` (${org})` : ''} called back`;
}

export function facilityLine(f: { name: string | null; facilityName: string | null; callbackPhone: string | null }): string {
  return `Facility callback: ${f.name ?? 'name not given'}, ${f.facilityName ?? 'facility not given'}, ${f.callbackPhone ?? 'no callback number'}`;
}

/** What the community reported — the three OL-163a facts, nothing else. */
export function facilityFactLines(facts: FacilityFacts | null | undefined): string[] {
  const f = facts ?? { bedsAvailable: null, startingPrice: null, medicaidWaiver: null };
  return [
    `Openings: ${f.bedsAvailable ?? 'not given'}`,
    `Starting price: ${f.startingPrice != null ? `$${f.startingPrice.toLocaleString('en-US')}/mo` : 'not given'}`,
    `Medicaid waiver: ${f.medicaidWaiver ? WAIVER_LABEL[f.medicaidWaiver] : 'not given'}`,
  ];
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

async function sendSms(lead: InboundAlertInput): Promise<InboundAlertResult['sms']> {
  const to = (process.env['ADMIN_NOTIFY_MOBILE'] ?? '').trim();
  if (!to) {
    console.warn('[inbound-alert] ADMIN_NOTIFY_MOBILE not set — planner SMS skipped', { leadId: lead.leadId });
    return 'skipped';
  }
  try {
    const ok = await smsService.sendSMS(to, alertLine(lead));
    return ok ? 'sent' : 'failed';
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'inbound-alert', channel: 'sms' }, extra: { leadId: lead.leadId } });
    return 'failed';
  }
}

/** Where admin lead alerts go: ADMIN_NOTIFY_EMAIL → legacy CLAIM_NOTIFY_EMAIL → Chris. */
export function adminNotifyEmail(): string {
  return process.env['ADMIN_NOTIFY_EMAIL'] || process.env['CLAIM_NOTIFY_EMAIL'] || 'chris@getcarelinkai.com';
}

/**
 * One admin alert email through the suppression-guarded Resend path. Shared by
 * call leads and (OL-177) web inquiries on unclaimed homes. Never throws.
 */
export async function sendAdminLeadEmail(msg: { leadId: string; subject: string; text: string; html: string; feature: string }): Promise<'sent' | 'failed' | 'skipped'> {
  if (!process.env['RESEND_API_KEY']) {
    console.warn(`[${msg.feature}] RESEND_API_KEY not set — email skipped`, { leadId: msg.leadId });
    return 'skipped';
  }
  const from = process.env['EMAIL_FROM'] || 'noreply@getcarelinkai.com';
  try {
    const { error } = await guardedResendSend({ from: `CareLinkAI <${from}>`, to: [adminNotifyEmail()], subject: msg.subject, text: msg.text, html: msg.html });
    if (error) {
      console.error(`[${msg.feature}] Resend error`, { leadId: msg.leadId, message: error.message ?? error.name });
      return 'failed';
    }
    return 'sent';
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: msg.feature, channel: 'email' }, extra: { leadId: msg.leadId } });
    return 'failed';
  }
}

async function sendEmail(lead: InboundAlertInput): Promise<InboundAlertResult['email']> {
  if (lead.callerType === 'FACILITY') {
    // Unmatched facility number → it landed as a lead, not a QA item.
    return sendFacilityEmail({
      refId: lead.leadId,
      name: lead.name,
      facilityName: lead.organization,
      callbackPhone: lead.callbackPhone,
      facility: lead.facility,
      receivedAt: lead.receivedAt,
      link: `${appUrl()}/admin/inbound-leads`,
      linkLabel: 'Not matched to a listing — open inbound leads',
    });
  }
  const line = alertLine(lead);
  const adminLink = `${appUrl()}/admin/inbound-leads`;
  const flags = [lead.afterHours ? 'after hours' : null, lead.phiFlag ? 'reason redacted (possible PHI)' : null].filter(Boolean).join(' · ');
  return sendAdminLeadEmail({
    leadId: lead.leadId,
    feature: 'inbound-alert',
    subject: alertSubject(lead.callerType, lead.name, lead.organization),
    text:
      `${line}\n` +
      (flags ? `${flags}\n` : '') +
      `Received ${lead.receivedAt.toISOString()}\n\n` +
      (lead.recordingUrl ? `Recording: ${lead.recordingUrl}\n` : '') +
      (lead.transcriptUrl ? `Transcript: ${lead.transcriptUrl}\n` : '') +
      `\nMark contacted / close: ${adminLink}\n`,
    html:
      `<p><strong>${esc(line)}</strong></p>` +
      (flags ? `<p style="color:#b45309">${esc(flags)}</p>` : '') +
      `<p style="color:#6b7280;font-size:13px">Received ${esc(lead.receivedAt.toISOString())}</p>` +
      `<ul>` +
      (lead.recordingUrl ? `<li><a href="${esc(lead.recordingUrl)}">Recording</a></li>` : '') +
      (lead.transcriptUrl ? `<li><a href="${esc(lead.transcriptUrl)}">Transcript</a></li>` : '') +
      `</ul>` +
      `<p><a href="${esc(adminLink)}">Mark contacted / close →</a></p>`,
  });
}

type FacilityEmail = {
  refId: string;
  name: string | null;
  facilityName: string | null;
  callbackPhone: string | null;
  facility: FacilityFacts | null | undefined;
  receivedAt: Date;
  link: string;
  linkLabel: string;
};

function sendFacilityEmail(f: FacilityEmail): Promise<'sent' | 'failed' | 'skipped'> {
  const line = facilityLine(f);
  const facts = facilityFactLines(f.facility);
  return sendAdminLeadEmail({
    leadId: f.refId,
    feature: 'inbound-alert',
    subject: alertSubject('FACILITY', f.facilityName ?? f.name, null),
    text: `${line}\n\n${facts.join('\n')}\n\nReceived ${f.receivedAt.toISOString()}\n\n${f.linkLabel}: ${f.link}\n`,
    html:
      `<p><strong>${esc(line)}</strong></p>` +
      `<ul>${facts.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` +
      `<p style="color:#6b7280;font-size:13px">Received ${esc(f.receivedAt.toISOString())}</p>` +
      `<p><a href="${esc(f.link)}">${esc(f.linkLabel)} →</a></p>`,
  });
}

export type FacilityObservationAlertInput = {
  observationId: string;
  homeName: string | null;
  name: string | null;
  organization: string | null;
  callbackPhone: string | null;
  facility: FacilityFacts;
  receivedAt: Date;
};

/**
 * FACILITY call matched to a home: the observation is already in the QA queue;
 * this emails Chris a pointer to it. Never throws.
 */
export async function sendFacilityObservationAlert(obs: FacilityObservationAlertInput): Promise<InboundAlertResult> {
  let email: InboundAlertResult['email'] = 'failed';
  try {
    email = await sendFacilityEmail({
      refId: obs.observationId,
      name: obs.name,
      facilityName: obs.homeName ?? obs.organization,
      callbackPhone: obs.callbackPhone,
      facility: obs.facility,
      receivedAt: obs.receivedAt,
      link: `${appUrl()}/admin/call-qa#obs-${encodeURIComponent(obs.observationId)}`,
      linkLabel: 'Review in the call QA queue',
    });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'inbound-alert' }, extra: { observationId: obs.observationId } });
  }
  const result: InboundAlertResult = { sms: 'skipped', email };
  console.log('[inbound-alert]', { observationId: obs.observationId, callerType: 'FACILITY', ...result });
  return result;
}

/** Never throws. Returns what happened per channel (for logs / tests). */
export async function sendInboundLeadAlerts(lead: InboundAlertInput): Promise<InboundAlertResult> {
  const ch = alertChannels(lead.callerType);
  const result: InboundAlertResult = { sms: 'skipped', email: 'skipped' };
  try {
    if (ch.sms) result.sms = await sendSms(lead);
    if (ch.email) result.email = await sendEmail(lead);
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'inbound-alert' }, extra: { leadId: lead.leadId } });
  }
  console.log('[inbound-alert]', { leadId: lead.leadId, callerType: lead.callerType, ...result });
  return result;
}
