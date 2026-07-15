/**
 * DP FOLLOW-UP SEQUENCE ENGINE (feat/dp-lead-capture).
 *
 * One nurture sequence per DPLead, started the instant Anita logs the lead
 * (Touch 1, immediate) and advanced by the dp-followups cron.
 *
 * Cadence (days from lead creation): Touch 1 = 0, 2 = +3, 3 = +7, 4 = +14, then
 * EXHAUSTED. 1:1 personal emails From chris@ / Reply-To placements@ (see email.ts).
 * EMAIL ONLY — no SMS anywhere in this lane (TCPA; out of scope until Haran's
 * opinion + consent capture). CAN-SPAM is handled in sendDpFollowupEmail
 * (unsubscribe + postal + List-Unsubscribe headers); this module refuses to send
 * without a configured COMPANY_POSTAL_ADDRESS.
 *
 * Idempotent: the cron advances a lead by at most one touch per run, and only
 * touches leads whose nextTouchAt is due and whose status is still 'active'.
 *
 * Hard stops (status leaves 'active'): a planner reply (admin "Mark replied"),
 * booked / patient_sent (admin buttons), or a hard unsubscribe (sets
 * status='stopped'). The cron never emails a lead that isn't 'active', and it
 * checks the email-suppression list before every send.
 *
 * MASTER FLAG: the entire sequence (immediate Touch 1 AND the cron touches 2-4)
 * is OFF unless DP_FOLLOWUP_ENABLED is explicitly truthy — same discipline as the
 * claim drip (OL-109), so a redeploy can never silently resume autonomous email.
 */

import { prisma } from '@/lib/prisma';
import { signUnsubscribeToken } from '@/lib/unsubscribe-token';
import { sendDpFollowupEmail } from '@/lib/email';
import { captureError } from '@/lib/sentry';
import { DP_FOLLOWUP_OFFSETS_DAYS, MAX_DP_TOUCHES } from '@/lib/dp-outreach/copy';

const DAY_MS = 86_400_000;

/** Master kill switch. Paused by DEFAULT so nothing sends until Chris flips it. */
export function dpFollowupEnabled(): boolean {
  const v = (process.env['DP_FOLLOWUP_ENABLED'] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}
/** Founder intro video, surfaced in the copy. Config so it can change without a deploy-only edit. */
export function founderVideoUrl(): string {
  return (
    process.env['FOUNDER_VIDEO_URL'] ||
    'https://app.heygen.com/videos/founder-04841e9bef8f49cdac30a1b2d9934f9e'
  ).trim();
}
function postalAddress(): string | null {
  const v = (process.env['COMPANY_POSTAL_ADDRESS'] || '').trim();
  // Guard against an obvious placeholder being left in the env.
  return v && !/«|set .*before/i.test(v) ? v : null;
}
function unsubscribeUrl(email: string, secret: string): string {
  return `${appUrl()}/api/outreach/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(email, secret))}`;
}
/** Returns the suppression reason ('unsubscribe'|'bounce'|'manual') if suppressed, else null. */
async function suppressionReason(email: string): Promise<string | null> {
  const s = await prisma.emailSuppression.findUnique({ where: { email: email.toLowerCase() }, select: { reason: true } });
  return s ? (s.reason || 'unsubscribe') : null;
}
/** First token of a full name, for the greeting. '' when unknown. */
export function firstNameOf(fullName: string | null | undefined): string {
  return (fullName || '').trim().split(/\s+/)[0] || '';
}

type SeqLead = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  touchStep: number;
};

/** Send one touch. Returns true if accepted. Refuses without postal (CAN-SPAM). */
async function sendTouch(lead: SeqLead, touch: number): Promise<boolean> {
  const secret = process.env['NEXTAUTH_SECRET'] || '';
  const postal = postalAddress();
  const email = lead.email?.trim();
  if (!secret || !postal || !email) return false;
  return sendDpFollowupEmail({
    toEmail: email,
    plannerFirstName: firstNameOf(lead.name),
    touch,
    videoUrl: founderVideoUrl(),
    unsubscribeUrl: unsubscribeUrl(email, secret),
    postalAddress: postal,
  });
}

/**
 * Fire Touch 1 immediately when a lead is logged. No-op if the sequence is
 * disabled, the lead already advanced, its status isn't 'active', the address is
 * suppressed, or the send fails (leaves it unstarted so it can start cleanly
 * later). Fire-and-forget; never throws.
 */
export async function startDpSequenceOnLead(params: { leadId: string }): Promise<void> {
  const { leadId } = params;
  try {
    if (!dpFollowupEnabled()) return; // PAUSED — no autonomous Touch 1
    const lead = await prisma.dPLead.findUnique({
      where: { id: leadId },
      select: { id: true, name: true, email: true, createdAt: true, touchStep: true, status: true },
    });
    if (!lead) return;
    if (lead.status !== 'active') return; // already replied/stopped/etc.
    if (lead.touchStep > 0) return; // sequence already started
    const email = lead.email?.trim();
    if (!email) return;

    // Don't start into a suppressed address.
    const supp = await suppressionReason(email);
    if (supp) {
      await prisma.dPLead.update({
        where: { id: lead.id },
        data: { status: 'stopped', stoppedReason: supp, nextTouchAt: null },
      });
      return;
    }

    const sent = await sendTouch(lead, 1);
    if (!sent) return; // e.g. postal not configured — leave unstarted
    const now = new Date();
    await prisma.dPLead.update({
      where: { id: lead.id },
      data: {
        touchStep: 1,
        lastTouchAt: now,
        nextTouchAt: new Date(lead.createdAt.getTime() + DP_FOLLOWUP_OFFSETS_DAYS[1] * DAY_MS),
      },
    });
    console.log(`[dp-followup] started for lead ${lead.id}, touch 1`);
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'dp-followup' }, extra: { leadId, phase: 'start' },
    });
  }
}

/**
 * Cron: advance every due sequence by one touch. Re-checks stop conditions first
 * (status left 'active' → skipped by the query; suppressed → stop), sends the
 * next touch, and marks 'exhausted' after the final one.
 */
export async function advanceDpSequences(limit = 300): Promise<{ due: number; sent: number; stopped: number; disabled?: boolean }> {
  if (!dpFollowupEnabled()) return { due: 0, sent: 0, stopped: 0, disabled: true }; // PAUSED
  const now = new Date();
  const due = await prisma.dPLead.findMany({
    where: {
      status: 'active',
      nextTouchAt: { lte: now },
      touchStep: { gt: 0, lt: MAX_DP_TOUCHES },
    },
    select: { id: true, name: true, email: true, createdAt: true, touchStep: true },
    take: limit,
  });

  let sent = 0;
  let stopped = 0;
  for (const lead of due) {
    try {
      const email = lead.email?.trim();
      const stopReason = !email ? 'no_email' : await suppressionReason(email);
      if (stopReason) {
        await prisma.dPLead.update({
          where: { id: lead.id },
          data: { status: 'stopped', stoppedReason: stopReason, nextTouchAt: null },
        });
        stopped++;
        continue;
      }

      const nextTouch = (lead.touchStep ?? 0) + 1; // 2..4
      const ok = await sendTouch(lead, nextTouch);
      if (!ok) continue; // transient — retry next run, don't advance
      const exhausted = nextTouch >= MAX_DP_TOUCHES;
      await prisma.dPLead.update({
        where: { id: lead.id },
        data: {
          touchStep: nextTouch,
          lastTouchAt: now,
          nextTouchAt: exhausted ? null : new Date(lead.createdAt.getTime() + DP_FOLLOWUP_OFFSETS_DAYS[nextTouch] * DAY_MS),
          ...(exhausted ? { stoppedReason: 'exhausted' } : {}),
        },
      });
      sent++;
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { feature: 'dp-followup' }, extra: { leadId: lead.id, phase: 'advance' },
      });
    }
  }
  return { due: due.length, sent, stopped };
}

/**
 * Stop every active sequence for an email address (used by the shared outreach
 * unsubscribe route). Idempotent; only touches 'active' leads.
 */
export async function stopDpLeadsForEmail(email: string, reason = 'unsubscribe'): Promise<number> {
  const e = (email || '').trim().toLowerCase();
  if (!e) return 0;
  const res = await prisma.dPLead.updateMany({
    where: { email: { equals: e, mode: 'insensitive' }, status: 'active' },
    data: { status: 'stopped', stoppedReason: reason, nextTouchAt: null },
  });
  return res.count;
}
