/**
 * OL-167b — alerts for inbound-call leads. Fire-and-forget AFTER the DB write:
 *
 *   PLANNER         → SMS to ADMIN_NOTIFY_MOBILE (existing Twilio client) +
 *                     email to ADMIN_NOTIFY_EMAIL (Resend)
 *   FAMILY / OTHER  → email only
 *   FACILITY        → nothing (the QA queue is the alert)
 *
 * The SMS carries the one line "CareLinkAI planner callback: {name}, {org},
 * {phone}, {urgency}" — never the reason or transcript text. The email carries
 * the same line plus the recording / transcript links and the admin page link.
 * Failures are logged and reported, never thrown: the webhook already
 * answered 200 and the lead is in the table.
 */

import type { InboundCallerType, InboundLeadUrgency } from '@prisma/client';
import { captureError } from '@/lib/sentry';
import { guardedResendSend } from '@/lib/email';
import { smsService } from '@/lib/sms/sms-service';

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
};

export type InboundAlertResult = { sms: 'sent' | 'failed' | 'skipped'; email: 'sent' | 'failed' | 'skipped' };

const URGENCY_LABEL: Record<InboundLeadUrgency, string> = { TODAY: 'today', THIS_WEEK: 'this week', PLANNING: 'planning' };
const TYPE_LABEL: Record<InboundCallerType, string> = { PLANNER: 'planner', FAMILY: 'family', FACILITY: 'facility', OTHER: 'caller' };

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The one line both channels share. No reason, no transcript text. */
export function alertLine(lead: Pick<InboundAlertInput, 'callerType' | 'name' | 'organization' | 'callbackPhone' | 'urgency'>): string {
  const who = TYPE_LABEL[lead.callerType];
  return `CareLinkAI ${who} callback: ${lead.name ?? 'name not given'}, ${lead.organization ?? 'no org'}, ${lead.callbackPhone}, ${lead.urgency ? URGENCY_LABEL[lead.urgency] : 'urgency not given'}`;
}

export function alertChannels(callerType: InboundCallerType): { sms: boolean; email: boolean } {
  if (callerType === 'PLANNER') return { sms: true, email: true };
  if (callerType === 'FACILITY') return { sms: false, email: false };
  return { sms: false, email: true };
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
  const line = alertLine(lead);
  const adminLink = `${appUrl()}/admin/inbound-leads`;
  const flags = [lead.afterHours ? 'after hours' : null, lead.phiFlag ? 'reason redacted (possible PHI)' : null].filter(Boolean).join(' · ');
  return sendAdminLeadEmail({
    leadId: lead.leadId,
    feature: 'inbound-alert',
    subject: `📞 ${line}`,
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
