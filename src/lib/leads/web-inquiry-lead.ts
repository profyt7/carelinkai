/**
 * OL-177 — a family inquiry on an UNCLAIMED listing (owned by the directory
 * placeholder account) has no operator to receive it. It lands in the same
 * admin queue as inbound calls (/admin/inbound-leads, `InboundLead` with
 * source WEB_INQUIRY, callerType FAMILY) and emails ADMIN_NOTIFY_EMAIL through
 * the shared inbound-alert Resend path. The family gets a confirmation that a
 * CareLinkAI advisor will follow up — no time promise.
 *
 * What goes into the queue row and the admin email: the family's name, email
 * and phone as typed, the home's name, the payer lane derived from the answer
 * they picked, and the move-in timeframe they picked. Never the free-text
 * message, the resident's name or care needs — those stay on the Inquiry row
 * (admin can open it); nothing is added that the family did not type.
 *
 * Idempotent per inquiry (conversationId "web-inquiry:<inquiryId>", inquiryId
 * unique). Never throws: the inquiry is already saved when this runs.
 */

import type { InboundLeadUrgency } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { guardedResendSend } from '@/lib/email';
import { isAfterHours } from '@/lib/leads/inbound-lead';
import { sendAdminLeadEmail } from '@/lib/leads/inbound-alerts';
import { FEE_LANE_LABELS, deriveFeeLane, isPayerSource } from '@/lib/payer/payer-source';

export const WEB_INQUIRY_CONVERSATION_PREFIX = 'web-inquiry:';
import { ADVISOR_FOLLOW_UP_TEXT } from '@/lib/leads/advisor-copy';
export { ADVISOR_FOLLOW_UP_TEXT };

export type UnclaimedInquiryInput = {
  inquiryId: string;
  homeId: string;
  homeName: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  payerSource: string | null;
  /** Inquiry.additionalInfo — the form stores "Move-in timeframe: <choice>" there. */
  additionalInfo: string | null;
  receivedAt?: Date;
};

export type UnclaimedInquiryResult = {
  leadId: string | null;
  created: boolean;
  adminEmail: 'sent' | 'failed' | 'skipped';
  familyEmail: 'sent' | 'failed' | 'skipped';
};

/** The timeframe the family picked, or null. */
export function timeframeFrom(additionalInfo: string | null | undefined): string | null {
  const m = (additionalInfo ?? '').match(/Move-in timeframe:\s*([^\n]+)/i);
  return m?.[1]?.trim() || null;
}

/** "Immediately" is a same-day callback; any later choice is planning. */
export function urgencyFromTimeframe(timeframe: string | null): InboundLeadUrgency | null {
  if (!timeframe) return null;
  return /^immediately$/i.test(timeframe) ? 'TODAY' : 'PLANNING';
}

export function payerLaneLabel(payerSource: string | null | undefined): string {
  return FEE_LANE_LABELS[deriveFeeLane(isPayerSource(payerSource) ? payerSource : null)];
}

/** The queue row's one-line reason (≤ 280): home, payer lane, timeframe. */
export function webInquiryReason(input: Pick<UnclaimedInquiryInput, 'homeName' | 'payerSource' | 'additionalInfo'>): string {
  const tf = timeframeFrom(input.additionalInfo) ?? 'timeframe not given';
  return `Web inquiry on unclaimed listing: ${input.homeName} · ${payerLaneLabel(input.payerSource)} · ${tf}`.slice(0, 280);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}

/** Admin alert body — the fields listed in the header comment, nothing else. */
export function adminAlertContent(input: UnclaimedInquiryInput): { subject: string; text: string; html: string } {
  const name = input.contactName?.trim() || 'name not given';
  const rows: Array<[string, string]> = [
    ['Family', name],
    ['Email', input.contactEmail?.trim() || '—'],
    ['Phone', input.contactPhone?.trim() || '—'],
    ['Home', `${input.homeName} (unclaimed listing)`],
    ['Payer lane', payerLaneLabel(input.payerSource)],
    ['Timeframe', timeframeFrom(input.additionalInfo) ?? 'not given'],
  ];
  const queue = `${appUrl()}/admin/inbound-leads`;
  return {
    subject: `📝 Family inquiry (unclaimed listing): ${name} → ${input.homeName}`,
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nThe home has not claimed its listing, so no one else received this.\nInbound queue: ${queue}\n`,
    html:
      `<p><strong>Family inquiry on an unclaimed listing</strong> — no one else received this.</p>` +
      `<table style="font-size:14px">${rows.map(([k, v]) => `<tr><td style="color:#6b7280;padding-right:12px">${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>` +
      `<p><a href="${esc(queue)}">Open the inbound queue →</a></p>`,
  };
}

/** Family confirmation — no time promise, no home-reply promise. */
export function familyConfirmationContent(input: Pick<UnclaimedInquiryInput, 'contactName' | 'homeName'>): { subject: string; text: string; html: string } {
  const first = input.contactName?.trim().split(/\s+/)[0] || 'there';
  return {
    subject: `We received your message about ${input.homeName}`,
    text: `Hi ${first},\n\nThanks for reaching out about ${input.homeName}. ${ADVISOR_FOLLOW_UP_TEXT}\n\n— CareLinkAI\n`,
    html: `<p>Hi ${esc(first)},</p><p>Thanks for reaching out about ${esc(input.homeName)}. ${esc(ADVISOR_FOLLOW_UP_TEXT)}</p><p>— CareLinkAI</p>`,
  };
}

async function sendFamilyConfirmation(input: UnclaimedInquiryInput, leadId: string): Promise<'sent' | 'failed' | 'skipped'> {
  const to = input.contactEmail?.trim();
  if (!to) return 'skipped';
  if (!process.env['RESEND_API_KEY']) {
    console.warn('[web-inquiry-lead] RESEND_API_KEY not set — family confirmation skipped', { leadId });
    return 'skipped';
  }
  const from = process.env['EMAIL_FROM'] || 'noreply@getcarelinkai.com';
  try {
    const { error } = await guardedResendSend({ from: `CareLinkAI <${from}>`, to: [to], ...familyConfirmationContent(input) });
    if (error) {
      console.error('[web-inquiry-lead] Resend error (family)', { leadId, message: error.message ?? error.name });
      return 'failed';
    }
    return 'sent';
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'web-inquiry-lead', channel: 'family-email' }, extra: { leadId } });
    return 'failed';
  }
}

/** Queue the inquiry + alert admin + confirm to the family. Never throws. */
export async function routeUnclaimedInquiry(input: UnclaimedInquiryInput): Promise<UnclaimedInquiryResult> {
  const result: UnclaimedInquiryResult = { leadId: null, created: false, adminEmail: 'skipped', familyEmail: 'skipped' };
  try {
    const existing = await prisma.inboundLead.findUnique({ where: { inquiryId: input.inquiryId }, select: { id: true } });
    if (existing) {
      result.leadId = existing.id;
      return result; // already queued + alerted for this inquiry
    }
    const receivedAt = input.receivedAt ?? new Date();
    const lead = await prisma.inboundLead.create({
      data: {
        conversationId: `${WEB_INQUIRY_CONVERSATION_PREFIX}${input.inquiryId}`,
        source: 'WEB_INQUIRY',
        callerType: 'FAMILY',
        name: input.contactName?.trim() || null,
        organization: input.homeName,
        callbackPhone: input.contactPhone?.trim() || null,
        contactEmail: input.contactEmail?.trim() || null,
        homeId: input.homeId,
        inquiryId: input.inquiryId,
        urgency: urgencyFromTimeframe(timeframeFrom(input.additionalInfo)),
        reason: webInquiryReason(input),
        afterHours: isAfterHours(receivedAt),
        receivedAt,
      },
      select: { id: true },
    });
    result.leadId = lead.id;
    result.created = true;
    result.adminEmail = await sendAdminLeadEmail({ leadId: lead.id, feature: 'web-inquiry-lead', ...adminAlertContent(input) });
    result.familyEmail = await sendFamilyConfirmation(input, lead.id);
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { tags: { feature: 'web-inquiry-lead' }, extra: { inquiryId: input.inquiryId } });
  }
  console.log('[web-inquiry-lead]', { inquiryId: input.inquiryId, ...result });
  return result;
}
