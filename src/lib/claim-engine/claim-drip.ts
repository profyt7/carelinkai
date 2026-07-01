/**
 * Per-facility CLAIM DRIP (email-only). ONE active sequence per unclaimed home,
 * started on the first lead and advanced by the claim-drip cron.
 *
 * Cadence (days from start): touch 1 = 0, 2 = 3, 3 = 7, 4 = 14, then EXHAUSTED.
 * Copy escalates per touch and always surfaces the live "N families waiting"
 * count (computed from NEW inquiries). EMAIL ONLY — no SMS in the cold pre-claim
 * path (TCPA / A2P risk). CAN-SPAM is handled in sendClaimDripEmail (unsubscribe
 * + postal + List-Unsubscribe headers); this module refuses to send without a
 * configured COMPANY_POSTAL_ADDRESS.
 *
 * Hard stops (claimDripStoppedReason): claimed | unsubscribe | bounce | no_email
 * | exhausted. Subsequent leads on an already-started drip do NOT start a new one
 * — the waiting count simply grows and the next scheduled touch reflects it.
 *
 * Instrumentation: claimDripStep records touches sent; when the cron detects a
 * claim it freezes the step + sets stoppedReason='claimed', so a claim can be
 * attributed to "claimed after N touches".
 */

import { prisma } from '@/lib/prisma';
import { signClaimToken, DEFAULT_CLAIM_TOKEN_TTL_HOURS } from '@/lib/claim-token';
import { signUnsubscribeToken } from '@/lib/unsubscribe-token';
import { sendClaimDripEmail } from '@/lib/email';
import { captureError } from '@/lib/sentry';

/** Sentinel operator that owns unclaimed/directory listings. Inlined to keep this
 *  module free of a cycle with inquiry-claim-notification (which imports the drip). */
const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';
function isUnclaimedHome(operatorUserEmail: string | null | undefined): boolean {
  return (operatorUserEmail ?? '').toLowerCase() === DIRECTORY_UNCLAIMED_EMAIL;
}

/** Day offsets from drip start for each touch. Length = max touches.
 *  Reduced to 2 (was 4) — a real event nudge + ONE soft follow-up (OL-109 copy
 *  rewrite). Fewer, gentler touches read less like spam. */
export const DRIP_OFFSETS_DAYS = [0, 3];
export const MAX_DRIP_TOUCHES = DRIP_OFFSETS_DAYS.length;
const DAY_MS = 86_400_000;

/** Master kill switch — the ENTIRE drip (event-driven touch-1 AND the cron's
 *  touches 2-4) is OFF unless CLAIM_DRIP_ENABLED is explicitly truthy. Paused by
 *  DEFAULT so a redeploy can never silently resume autonomous outreach (OL-109).
 *  Re-enable is a single Render env flip: CLAIM_DRIP_ENABLED=1. */
export function claimDripEnabled(): boolean {
  const v = (process.env['CLAIM_DRIP_ENABLED'] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** Cheap pre-send guard: reject syntactically-invalid / placeholder outreach
 *  emails so the drip never burns sender reputation on obviously-dead addresses.
 *  Real hard bounces are caught separately via the Resend webhook →
 *  EmailSuppression. Format-only + a small placeholder blocklist (no DNS). */
export function emailLooksSendable(email: string | null | undefined): boolean {
  const e = (email || '').trim().toLowerCase();
  if (!e || e.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)) return false;
  if (e.includes('carelinkai.system')) return false;
  if (/^(no-?reply|noreply|postmaster|mailer-daemon)@/.test(e)) return false;
  if (/(^|@)(example|test|localhost|invalid|sentinel)\b/.test(e)) return false;
  return true;
}

function appUrl(): string {
  return (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
}
function postalAddress(): string | null {
  const v = (process.env['COMPANY_POSTAL_ADDRESS'] || '').trim();
  // Guard against an obvious placeholder being left in the env.
  return v && !/«|set .*before/i.test(v) ? v : null;
}
function buildClaimUrl(homeId: string, operatorEmail: string, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const token = signClaimToken(
    { operatorEmail: operatorEmail.toLowerCase(), homeId, clevelandFounder: true, iat: now, exp: now + DEFAULT_CLAIM_TOKEN_TTL_HOURS * 3600 },
    secret,
  );
  return `${appUrl()}/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
}
function unsubscribeUrl(email: string, secret: string): string {
  return `${appUrl()}/api/outreach/unsubscribe?token=${encodeURIComponent(signUnsubscribeToken(email, secret))}`;
}
async function waitingCount(homeId: string): Promise<number> {
  return prisma.inquiry.count({ where: { homeId, status: 'NEW' } });
}
/** Returns the suppression reason ('unsubscribe'|'bounce'|'manual') if suppressed, else null. */
async function suppressionReason(email: string): Promise<string | null> {
  const s = await prisma.emailSuppression.findUnique({ where: { email: email.toLowerCase() }, select: { reason: true } });
  return s ? (s.reason || 'unsubscribe') : null;
}

type DripHome = {
  id: string;
  name: string;
  outreachEmail: string | null;
  claimDripStep: number;
  claimDripStartedAt: Date | null;
  address?: { city: string | null } | null;
};

/** Send one drip touch. Returns true if the email was accepted. Refuses without postal (CAN-SPAM). */
async function sendTouch(home: DripHome, touch: number, trigger: 'inquiry' | 'tour'): Promise<boolean> {
  const secret = process.env['NEXTAUTH_SECRET'] || '';
  const postal = postalAddress();
  const email = home.outreachEmail?.trim();
  if (!secret || !postal || !email) return false;
  const count = await waitingCount(home.id);
  return sendClaimDripEmail({
    facilityName: home.name,
    toEmail: email,
    claimUrl: buildClaimUrl(home.id, email, secret),
    unsubscribeUrl: unsubscribeUrl(email, secret),
    postalAddress: postal,
    touch,
    waitingCount: count,
    trigger,
    city: home.address?.city ?? null,
  });
}

/**
 * Start the drip on the FIRST lead for an unclaimed home (sends touch 1). No-op if
 * a drip is already started/stopped, the home is claimed, or there's no outreach
 * email. Fire-and-forget; never throws.
 */
export async function startClaimDripOnLead(params: { homeId: string; trigger?: 'inquiry' | 'tour' }): Promise<void> {
  const { homeId, trigger = 'inquiry' } = params;
  try {
    if (!claimDripEnabled()) return; // drip PAUSED (OL-109) — no autonomous touch-1
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id: homeId },
      select: {
        id: true, name: true, outreachEmail: true, claimDripStep: true,
        claimDripStartedAt: true, claimDripStoppedReason: true,
        address: { select: { city: true } },
        operator: { select: { user: { select: { email: true } } } },
      },
    });
    if (!home) return;
    if (!isUnclaimedHome(home.operator?.user?.email)) return; // claimed → handled by operator alerts
    if (home.claimDripStartedAt || home.claimDripStoppedReason) return; // already started/stopped — count just grows
    const email = home.outreachEmail?.trim();
    if (!email) return; // no contact → public waiting counter drives the claim
    if (!emailLooksSendable(email)) {
      // Bad/placeholder directory address → never start; mark so we don't retry.
      await prisma.assistedLivingHome.update({ where: { id: home.id }, data: { claimDripStoppedReason: 'invalid_email' } });
      return;
    }

    // Don't start into a suppressed address.
    const supp = await suppressionReason(email);
    if (supp) {
      await prisma.assistedLivingHome.update({ where: { id: home.id }, data: { claimDripStoppedReason: supp } });
      return;
    }

    const sent = await sendTouch(home, 1, trigger);
    if (!sent) return; // e.g. postal not configured — leave unstarted so it can start cleanly later
    const now = new Date();
    await prisma.assistedLivingHome.update({
      where: { id: home.id },
      data: {
        claimDripStartedAt: now,
        claimDripStep: 1,
        claimDripNextAt: new Date(now.getTime() + DRIP_OFFSETS_DAYS[1] * DAY_MS),
        claimNudgeLastSentAt: now,
        claimDripStoppedReason: null,
      },
    });
    console.log(`[claim-drip] started for "${home.name}" (${home.id}), touch 1 (${trigger})`);
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'claim-drip' }, extra: { homeId, phase: 'start' },
    });
  }
}

/**
 * Cron: advance every due drip by one touch. Checks hard-stop conditions first
 * (claimed / suppressed / no email), sends the next escalating touch otherwise,
 * and marks 'exhausted' after the final touch.
 */
export async function advanceClaimDrips(limit = 300): Promise<{ due: number; sent: number; stopped: number; disabled?: boolean }> {
  if (!claimDripEnabled()) return { due: 0, sent: 0, stopped: 0, disabled: true }; // PAUSED (OL-109)
  const now = new Date();
  const due = await prisma.assistedLivingHome.findMany({
    where: {
      claimDripStartedAt: { not: null },
      claimDripStoppedReason: null,
      claimDripNextAt: { lte: now },
      claimDripStep: { lt: MAX_DRIP_TOUCHES },
    },
    select: {
      id: true, name: true, outreachEmail: true, claimDripStep: true, claimDripStartedAt: true,
      address: { select: { city: true } },
      operator: { select: { user: { select: { email: true } } } },
    },
    take: limit,
  });

  let sent = 0;
  let stopped = 0;
  for (const home of due) {
    try {
      const email = home.outreachEmail?.trim();
      let stopReason: string | null = null;
      if (!isUnclaimedHome(home.operator?.user?.email)) stopReason = 'claimed';
      else if (!email) stopReason = 'no_email';
      else if (!emailLooksSendable(email)) stopReason = 'invalid_email';
      else stopReason = await suppressionReason(email);

      if (stopReason) {
        await prisma.assistedLivingHome.update({
          where: { id: home.id },
          data: { claimDripStoppedReason: stopReason, claimDripNextAt: null },
        });
        stopped++;
        continue;
      }

      const nextTouch = (home.claimDripStep ?? 0) + 1; // 2..4
      const ok = await sendTouch(home, nextTouch, 'inquiry');
      if (!ok) continue; // transient (e.g. postal/email issue) — retry next run, don't advance
      const exhausted = nextTouch >= MAX_DRIP_TOUCHES;
      const startedAt = home.claimDripStartedAt!;
      await prisma.assistedLivingHome.update({
        where: { id: home.id },
        data: {
          claimDripStep: nextTouch,
          claimNudgeLastSentAt: now,
          claimDripNextAt: exhausted ? null : new Date(startedAt.getTime() + DRIP_OFFSETS_DAYS[nextTouch] * DAY_MS),
          claimDripStoppedReason: exhausted ? 'exhausted' : null,
        },
      });
      sent++;
    } catch (error) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        tags: { feature: 'claim-drip' }, extra: { homeId: home.id, phase: 'advance' },
      });
    }
  }
  return { due: due.length, sent, stopped };
}
