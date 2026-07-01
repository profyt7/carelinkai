/**
 * Email Service using Resend API
 * 
 * This module provides email functionality for CareLinkAI using Resend.
 * Resend is a modern email API service that simplifies transactional emails.
 * 
 * Features:
 * - Simple API integration (no SMTP configuration needed)
 * - High deliverability rates
 * - Professional HTML email templates
 * - Automatic fallback for missing API key (logs only)
 */

import { Resend } from 'resend';
import { captureError } from '@/lib/sentry';

// Initialize Resend with API key from environment
const resend = new Resend(process.env.RESEND_API_KEY);

// Constants
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@getcarelinkai.com';
const APP_NAME = 'CareLinkAI';
const TOKEN_EXPIRY_HOURS = 24;

// Monitored inbox that operator REPLIES to cold/outreach emails should land in.
// FROM_EMAIL is a noreply address, so without an explicit reply-to an interested
// operator who just hits "Reply" is lost. Defaults to chris@getcarelinkai.com;
// override with OUTREACH_REPLY_TO (falls back to ADMIN_NOTIFY_EMAIL).
const OUTREACH_REPLY_TO =
  process.env.OUTREACH_REPLY_TO || process.env.ADMIN_NOTIFY_EMAIL || 'chris@getcarelinkai.com';

/**
 * Send a verification email to a new user
 * 
 * @param email - User's email address
 * @param firstName - User's first name for personalization
 * @param verificationToken - Unique token for email verification
 * @returns Promise<boolean> - true if email sent successfully, false otherwise
 */
export async function sendVerificationEmail(
  email: string,
  firstName: string,
  verificationToken: string
): Promise<boolean> {
  try {
    console.log(`[Resend] Sending verification email to ${email}`);
    
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY is not configured in environment variables');
      console.error('[Resend] Please set RESEND_API_KEY on Render dashboard');
      return false;
    }
    
    // Generate verification link
    const APP_URL = process.env.NEXTAUTH_URL || 'https://getcarelinkai.com';
    const verificationLink = `${APP_URL}/auth/verify?token=${verificationToken}`;
    
    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject: `Verify Your ${APP_NAME} Account`,
      html: generateVerificationEmailHTML(firstName, verificationLink),
      text: generateVerificationEmailText(firstName, verificationLink),
    });
    
    if (error) {
      console.error('[Resend] Error sending email:', error);
      return false;
    }
    
    console.log('[Resend] ✅ Verification email sent successfully');
    console.log('[Resend] Email ID:', data?.id);
    return true;
    
  } catch (error) {
    console.error('[Resend] Exception while sending email:', error);
    return false;
  }
}

/** Minimal HTML escape for interpolating user-supplied strings into email HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Notify the founder/admin the instant an operator claims a listing (either via
 * the operator self-claim onboarding flow or an admin claim), so claims surface
 * in real time without polling the backend (OL-079).
 *
 * Fire-and-forget from the claim routes: failures are logged AND reported to
 * Sentry, but never block the claim itself (the caller never awaits the result
 * in a way that affects the response).
 *
 * Recipient defaults to chris@getcarelinkai.com (the business inbox), overridable
 * via ADMIN_NOTIFY_EMAIL (or the legacy CLAIM_NOTIFY_EMAIL, kept for back-compat).
 * Optional cc via CLAIM_NOTIFY_CC — set to empty string to drop it; a cc that
 * equals the primary recipient is dropped automatically.
 */
export async function sendOperatorClaimNotification(args: {
  facilityName: string;
  operatorEmail: string;
  /** Display name of the claiming operator, if known. */
  operatorName?: string;
  /** Home id used to build the admin deep link (/admin/homes/<id>). */
  homeId?: string;
  status?: string;
}): Promise<boolean> {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.CLAIM_NOTIFY_EMAIL || 'chris@getcarelinkai.com';
  // Optional cc (CLAIM_NOTIFY_CC=''  drops it). Default to none; drop a cc that
  // just duplicates the primary recipient.
  const ccRaw = (process.env.CLAIM_NOTIFY_CC ?? '').trim();
  const cc = ccRaw && ccRaw.toLowerCase() !== to.toLowerCase() ? [ccRaw] : undefined;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY not configured — skipping operator claim notification');
      return false;
    }
    const facilityName = args.facilityName || '(unnamed facility)';
    const operatorEmail = args.operatorEmail || '(unknown operator)';
    const operatorName = args.operatorName?.trim();
    const status = args.status;

    // Timestamp rendered in America/New_York (founder's timezone).
    const claimedAt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date()) + ' ET';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com';
    const adminLink = args.homeId ? `${appUrl.replace(/\/$/, '')}/admin/homes/${args.homeId}` : null;

    const operatorLine = operatorName
      ? `${operatorName} <${operatorEmail}>`
      : operatorEmail;

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      ...(cc ? { cc } : {}),
      subject: `🎉 New CareLinkAI claim — ${facilityName}`,
      text:
        `An operator just claimed a listing on CareLinkAI.\n\n` +
        `Facility: ${facilityName}\n` +
        `Operator: ${operatorLine}\n` +
        (status ? `Status: ${status}\n` : '') +
        `Claimed: ${claimedAt}\n` +
        (adminLink ? `\nReview it: ${adminLink}\n` : `\nReview it in the admin panel.\n`),
      html:
        `<p>An operator just claimed a listing on CareLinkAI. 🎉</p>` +
        `<ul>` +
        `<li><strong>Facility:</strong> ${escapeHtml(facilityName)}</li>` +
        `<li><strong>Operator:</strong> ${escapeHtml(operatorLine)}</li>` +
        (status ? `<li><strong>Status:</strong> ${escapeHtml(status)}</li>` : '') +
        `<li><strong>Claimed:</strong> ${escapeHtml(claimedAt)}</li>` +
        `</ul>` +
        (adminLink
          ? `<p><a href="${escapeHtml(adminLink)}">Review it in the admin panel →</a></p>`
          : `<p>Review it in the admin panel.</p>`),
    });

    if (error) {
      console.error('[Resend] Error sending operator claim notification:', error);
      captureError(
        error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'claim-notification' }, extra: { facilityName, homeId: args.homeId, status } }
      );
      return false;
    }
    console.log('[Resend] ✅ Operator claim notification sent. Email ID:', data?.id);
    return true;
  } catch (error) {
    console.error('[Resend] Exception sending operator claim notification:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'claim-notification' },
      extra: { facilityName: args.facilityName, homeId: args.homeId, status: args.status },
    });
    return false;
  }
}

/**
 * Notify the care team (admin) that a discharge planner submitted an in-app
 * CONCIERGE placement request, so Chris can curate a shortlist. This is the
 * "Wizard of Oz" path — the DP sees an AI-powered concierge; behind the scenes
 * a human curates.
 *
 * HIPAA: this email is intentionally PHI-FREE. It NEVER includes patient details
 * or the DP's free-text query (which can contain patient info). It carries only
 * the DP's name/org and a deep link into the admin concierge queue, where the
 * patient data lives behind auth. Fire-and-forget; logs + Sentry on failure.
 *
 * Recipient defaults to chris@getcarelinkai.com, overridable via ADMIN_NOTIFY_EMAIL.
 */
export async function sendConciergeRequestNotification(args: {
  /** Concierge request id (PlacementSearch id) for the admin deep link. */
  requestId: string;
  /** Display name of the submitting discharge planner, if known. */
  dpName?: string;
  /** DP organization, if known. */
  dpOrganization?: string;
}): Promise<boolean> {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.CLAIM_NOTIFY_EMAIL || 'chris@getcarelinkai.com';
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY not configured — skipping concierge request notification');
      return false;
    }
    const who = [args.dpName?.trim(), args.dpOrganization?.trim()].filter(Boolean).join(' · ') || 'A discharge planner';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com').replace(/\/$/, '');
    const adminLink = `${appUrl}/admin/concierge/${args.requestId}`;
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      replyTo: OUTREACH_REPLY_TO,
      subject: '🧑‍⚕️ New concierge placement request',
      text:
        `${who} submitted a concierge placement request on CareLinkAI.\n\n` +
        `Patient details are kept in-app (never emailed). Review and build the shortlist here:\n${adminLink}\n`,
      html:
        `<p>${escapeHtml(who)} submitted a <strong>concierge placement request</strong> on CareLinkAI.</p>` +
        `<p style="color:#6b7280;font-size:13px">Patient details are kept in-app (never emailed).</p>` +
        `<p><a href="${escapeHtml(adminLink)}">Review &amp; build the shortlist →</a></p>`,
    });
    if (error) {
      console.error('[Resend] Error sending concierge request notification:', error);
      captureError(error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'concierge-notification' }, extra: { requestId: args.requestId } });
      return false;
    }
    console.log('[Resend] ✅ Concierge request notification sent. Email ID:', data?.id);
    return true;
  } catch (error) {
    console.error('[Resend] Exception sending concierge request notification:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'concierge-notification' }, extra: { requestId: args.requestId },
    });
    return false;
  }
}

/**
 * Tell a discharge planner their concierge shortlist is ready (sent when an admin
 * curates + "Send to DP"). Goes to the DP's OWN account email.
 *
 * HIPAA: PHI-FREE by construction — names only the option count and links into the
 * app where the (auth-gated) shortlist lives. NEVER includes patient details or
 * the facility names/notes. Fire-and-forget: logged + Sentry on failure, never thrown.
 */
export async function sendConciergeShortlistReadyEmail(args: {
  toEmail: string;
  count: number;
}): Promise<boolean> {
  const toEmail = args.toEmail?.trim();
  if (!toEmail) return false;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY not configured — skipping concierge shortlist-ready email');
      return false;
    }
    const n = args.count > 0 ? args.count : 1;
    const optionWord = n === 1 ? 'option' : 'options';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com').replace(/\/$/, '');
    const link = `${appUrl}/discharge-planner/concierge`;
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [toEmail],
      replyTo: OUTREACH_REPLY_TO,
      subject: `Your CareLinkAI shortlist is ready — ${n} ${optionWord}`,
      text:
        `Your CareLinkAI care team has curated ${n} ${optionWord} for your placement request.\n\n` +
        `View your shortlist (with confirmed availability) in the app:\n${link}\n\n` +
        `Details are kept private and secure in CareLinkAI.`,
      html:
        `<p>Your CareLinkAI care team has curated <strong>${n} ${optionWord}</strong> for your placement request.</p>` +
        `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">View your shortlist</a></p>` +
        `<p style="color:#6b7280;font-size:13px">Details are kept private and secure in CareLinkAI.</p>`,
    });
    if (error) {
      console.error('[Resend] Error sending concierge shortlist-ready email:', error);
      captureError(error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'concierge-shortlist-ready' }, extra: { count: n } });
      return false;
    }
    console.log('[Resend] ✅ Concierge shortlist-ready email sent. Email ID:', data?.id);
    return true;
  } catch (error) {
    console.error('[Resend] Exception sending concierge shortlist-ready email:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'concierge-shortlist-ready' },
    });
    return false;
  }
}

/**
 * Notify the care team (admin) that a DP requested a tour from a concierge
 * shortlist, so Chris can coordinate it on the family's behalf. The concierge
 * promise: this NEVER black-holes — for an unclaimed home the operator is also
 * nudged (claim drip) but only CareLinkAI can actually coordinate.
 *
 * HIPAA: PHI-FREE — names the facility, the DP, and whether the home is claimed,
 * plus a deep link into the admin concierge request (where the patient's initials
 * + callback live, auth-gated). NEVER includes patient details. Fire-and-forget.
 *
 * Recipient defaults to chris@getcarelinkai.com (ADMIN_NOTIFY_EMAIL).
 */
export async function sendConciergeTourNotification(args: {
  /** Concierge request id (PlacementSearch id) for the admin deep link. */
  requestId: string;
  facilityName: string;
  /** true = claimed (operator notified directly); false = unclaimed (Chris coordinates). */
  claimed: boolean;
  dpName?: string;
  dpOrganization?: string;
}): Promise<boolean> {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.CLAIM_NOTIFY_EMAIL || 'chris@getcarelinkai.com';
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY not configured — skipping concierge tour notification');
      return false;
    }
    const who = [args.dpName?.trim(), args.dpOrganization?.trim()].filter(Boolean).join(' · ') || 'A discharge planner';
    const facility = args.facilityName?.trim() || 'a facility';
    const claimLine = args.claimed
      ? 'This home is CLAIMED — the operator was notified directly; you are cc’d to help coordinate.'
      : 'This home is UNCLAIMED — please coordinate the tour on the family’s behalf (the operator was also nudged to claim).';
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://getcarelinkai.com').replace(/\/$/, '');
    const adminLink = `${appUrl}/admin/concierge/${args.requestId}`;
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      replyTo: OUTREACH_REPLY_TO,
      subject: `🗓️ Concierge tour request — ${facility}`,
      text:
        `${who} requested a tour at ${facility} from their CareLinkAI concierge shortlist.\n\n` +
        `${claimLine}\n\n` +
        `Patient details are kept in-app (never emailed). Coordinate here:\n${adminLink}\n`,
      html:
        `<p>${escapeHtml(who)} requested a <strong>tour at ${escapeHtml(facility)}</strong> from their CareLinkAI concierge shortlist.</p>` +
        `<p>${escapeHtml(claimLine)}</p>` +
        `<p style="color:#6b7280;font-size:13px">Patient details are kept in-app (never emailed).</p>` +
        `<p><a href="${escapeHtml(adminLink)}">Coordinate this tour →</a></p>`,
    });
    if (error) {
      console.error('[Resend] Error sending concierge tour notification:', error);
      captureError(error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'concierge-tour' }, extra: { requestId: args.requestId } });
      return false;
    }
    console.log('[Resend] ✅ Concierge tour notification sent. Email ID:', data?.id);
    return true;
  } catch (error) {
    console.error('[Resend] Exception sending concierge tour notification:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'concierge-tour' }, extra: { requestId: args.requestId },
    });
    return false;
  }
}

/**
 * Inquiry→claim "pull" engine (OL-083): when a family inquires on an UNCLAIMED
 * listing and we know the operator's outreach email, nudge them to claim their
 * free listing so they can respond. The notification IS the claim CTA.
 *
 * HIPAA: the body is intentionally GENERIC — it names only the facility and says
 * a family is trying to reach them. It MUST NOT contain any inquiry/health
 * details; those stay behind auth and are revealed only after the operator
 * claims. Fire-and-forget: failures are logged + sent to Sentry, never thrown.
 */
export async function sendInquiryClaimNudgeEmail(args: {
  facilityName: string;
  toEmail: string;
  claimUrl: string;
  waitingCount?: number;
  /** A tour request is the hottest lead — use more urgent copy than an inquiry. */
  trigger?: 'inquiry' | 'tour';
}): Promise<boolean> {
  const facilityName = args.facilityName?.trim() || 'your community';
  const isTour = args.trigger === 'tour';
  const count = args.waitingCount && args.waitingCount > 1 ? args.waitingCount : 1;
  const leadPhrase = isTour
    ? `A family wants to tour`
    : count > 1
    ? `${count} families are trying to reach`
    : `A family is trying to reach`;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY not configured — skipping inquiry claim nudge');
      return false;
    }
    const safeFacility = escapeHtml(facilityName);
    const subject = isTour
      ? `A family wants to tour ${facilityName} — claim to confirm the visit`
      : `${leadPhrase} ${facilityName} on CareLinkAI`;
    const actionLine = isTour
      ? 'Claim your free listing in about 2 minutes to confirm the visit and respond securely:'
      : 'Claim your free listing in about 2 minutes to view and respond securely:';
    const text =
      (isTour ? `A family wants to tour ${facilityName} on CareLinkAI.\n\n` : `${leadPhrase} ${facilityName} on CareLinkAI.\n\n`) +
      `${actionLine}\n${args.claimUrl}\n\n` +
      `Details are kept private until you claim. There is no cost to claim or respond.`;
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
  <p>${isTour ? `A family wants to <strong>tour</strong> ` : `${escapeHtml(leadPhrase)} `}<strong>${safeFacility}</strong> on CareLinkAI.</p>
  <p>${escapeHtml(actionLine)}</p>
  <p><a href="${escapeHtml(args.claimUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${isTour ? 'Claim &amp; confirm the tour' : `Claim ${safeFacility}`}</a></p>
  <p style="color:#6b7280;font-size:13px">Details are kept private until you claim. There is no cost to claim or respond.</p>
</body></html>`;

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [args.toEmail],
      replyTo: OUTREACH_REPLY_TO,
      subject,
      text,
      html,
    });

    if (error) {
      console.error('[Resend] Error sending inquiry claim nudge:', error);
      captureError(
        error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'inquiry-claim-notification' }, extra: { facilityName } }
      );
      return false;
    }
    console.log('[Resend] ✅ Inquiry claim nudge sent. Email ID:', data?.id);
    return true;
  } catch (error) {
    console.error('[Resend] Exception sending inquiry claim nudge:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'inquiry-claim-notification' },
      extra: { facilityName },
    });
    return false;
  }
}

/**
 * Email backup of the operator SMS lead alert, for CLAIMED homes. SMS can be
 * missing/wrong/undeliverable, so a new inquiry or tour request also emails the
 * operator. HIPAA: generic only — names the facility + lead type, never the
 * family's name or any care/health detail. The CTA is the operator dashboard.
 */
export async function sendNewLeadOperatorEmail(args: {
  facilityName: string;
  toEmail: string;
  operatorFirstName?: string;
  leadType: 'inquiry' | 'tour';
  ctaUrl: string;
}): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) return false;
    const facility = escapeHtml(args.facilityName?.trim() || 'your community');
    const hi = args.operatorFirstName ? `Hi ${escapeHtml(args.operatorFirstName)}, ` : '';
    const lead = args.leadType === 'tour' ? 'tour request' : 'inquiry';
    const subject = args.leadType === 'tour'
      ? `New tour request for ${args.facilityName} on CareLinkAI`
      : `New inquiry for ${args.facilityName} on CareLinkAI`;
    const text =
      `${args.operatorFirstName ? `Hi ${args.operatorFirstName}, ` : ''}you have a new ${lead} for ${args.facilityName} on CareLinkAI.\n\n` +
      `Log in to view the details and respond:\n${args.ctaUrl}\n\n` +
      `Details are kept private and secure on CareLinkAI.`;
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
  <p>${hi}you have a new ${lead} for <strong>${facility}</strong> on CareLinkAI.</p>
  <p><a href="${escapeHtml(args.ctaUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">View &amp; respond</a></p>
  <p style="color:#6b7280;font-size:13px">Details are kept private and secure on CareLinkAI.</p>
</body></html>`;

    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [args.toEmail],
      replyTo: OUTREACH_REPLY_TO,
      subject,
      text,
      html,
    });
    if (error) {
      captureError(error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'operator-lead-alert' }, extra: { facilityName: args.facilityName, leadType: args.leadType } });
      return false;
    }
    return true;
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'operator-lead-alert' }, extra: { facilityName: args.facilityName },
    });
    return false;
  }
}

/**
 * One touch of the per-facility CLAIM DRIP (email-only). Two touches, signed by a
 * named human: touch 1 = real event nudge (a family asked/toured; + live waiting
 * count when >1), touch 2 = neutral soft follow-up (no implied demand). CAN-SPAM
 * compliant: one-click unsubscribe + company postal address + List-Unsubscribe /
 * RFC 8058 headers. Generic copy only — never PHI. Returns false on failure.
 */
export async function sendClaimDripEmail(args: {
  facilityName: string;
  toEmail: string;
  claimUrl: string;
  unsubscribeUrl: string;
  postalAddress: string;
  touch: number; // 1..2
  waitingCount: number;
  trigger?: 'inquiry' | 'tour';
}): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) return false;
    const facility = args.facilityName?.trim() || 'your community';
    const n = Math.max(1, args.waitingCount || 1);
    const fam = n === 1 ? 'family' : 'families';
    const isTour = args.trigger === 'tour';

    // Signed by a named human (Chris). Touch 1 is EVENT-DRIVEN, so it can truthfully
    // reference the family/tour that just came in (+ a real waiting count when >1).
    // Touch 2 (scheduled follow-up) is a NEUTRAL soft nudge — no "a family asked",
    // no count — so we never imply demand that isn't there (OL-109 copy rewrite).
    let subject: string;
    let lead: string;
    if (args.touch <= 1) {
      const waiting = n > 1 ? ` ${n} ${fam} are waiting to hear back.` : '';
      subject = isTour
        ? `A family asked to tour ${facility} on CareLinkAI`
        : `A family asked about ${facility} on CareLinkAI`;
      lead = isTour
        ? `Hi — I'm Chris, founder of CareLinkAI, a Cleveland-area assisted-living directory. A family just used our site to ask about touring ${facility}.${waiting}`
        : `Hi — I'm Chris, founder of CareLinkAI, a Cleveland-area assisted-living directory. A family just used our site to ask about ${facility}.${waiting}`;
    } else {
      subject = `Your ${facility} listing on CareLinkAI`;
      lead = `Hi — following up from Chris at CareLinkAI. Your community, ${facility}, is listed on our Cleveland-area directory but isn't claimed yet, so I can't route family inquiries to you.`;
    }
    const ask = `If you'd like to see and respond to family inquiries — it's free — you can claim ${facility} in about 2 minutes:`;
    const cta = `Claim ${escapeHtml(facility)}`;
    const text =
      `${lead}\n\n` +
      `${ask}\n${args.claimUrl}\n\n` +
      `Your details stay private until you claim. There's no cost to claim or respond.\n\n` +
      `If I've got the wrong contact, just reply and point me to the right person. Not interested? Unsubscribe below and I won't email again.\n— Chris\n\n` +
      `${APP_NAME} · ${args.postalAddress}\n` +
      `Unsubscribe (you won't be emailed about ${facility} again): ${args.unsubscribeUrl}`;
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
  <p>${escapeHtml(lead)}</p>
  <p>${escapeHtml(ask)}</p>
  <p><a href="${escapeHtml(args.claimUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${cta}</a></p>
  <p style="color:#6b7280;font-size:13px">Your details stay private until you claim. There's no cost to claim or respond.</p>
  <p style="color:#374151;font-size:14px">If I've got the wrong contact, just reply and point me to the right person.<br/>— Chris</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0"/>
  <p style="color:#9ca3af;font-size:12px">
    ${APP_NAME} · ${escapeHtml(args.postalAddress)}<br/>
    <a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe</a> — you won't be emailed about ${escapeHtml(facility)} again.
  </p>
</body></html>`;

    const { error } = await resend.emails.send({
      from: `Chris Tolliver, CareLinkAI <${OUTREACH_REPLY_TO}>`,
      to: [args.toEmail],
      replyTo: OUTREACH_REPLY_TO,
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<${args.unsubscribeUrl}>, <mailto:${FROM_EMAIL}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    if (error) {
      captureError(error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'claim-drip' }, extra: { facilityName: facility, touch: args.touch } });
      return false;
    }
    return true;
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'claim-drip' }, extra: { facilityName: args.facilityName },
    });
    return false;
  }
}

/**
 * PROACTIVE directory claim invite (distinct from sendInquiryClaimNudgeEmail).
 *
 * Used by the batch claim-nudge sender to invite an operator to claim their free
 * directory listing(s) — BEFORE any family inquiry exists. Copy is honest about the
 * context (it does NOT say "families are trying to reach you").
 *
 * COLLAPSED BY ADDRESS: one email per unique recipient. When the recipient operates
 * multiple unclaimed communities (e.g. a corporate marketing inbox), every community is
 * listed with its OWN claim link, so the recipient can claim all of them from one email.
 *
 * CAN-SPAM: includes a working one-click unsubscribe link, the company physical mailing
 * address (caller-supplied — the batch sender refuses to run if it's unset), and clear
 * sender identity. Sets the List-Unsubscribe + List-Unsubscribe-Post (RFC 8058) headers
 * so Gmail/Apple Mail render a native one-click unsubscribe. Returns false on any failure.
 */
export async function sendDirectoryClaimInviteEmail(args: {
  toEmail: string;
  communities: { name: string; claimUrl: string }[];
  unsubscribeUrl: string;
  postalAddress: string;
}): Promise<boolean> {
  const communities = (args.communities ?? []).filter((c) => c?.name && c?.claimUrl);
  if (communities.length === 0) return false;
  const multi = communities.length > 1;
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY not configured — skipping directory claim invite');
      return false;
    }
    const subject = multi
      ? `Claim your ${communities.length} free ${APP_NAME} listings`
      : `Claim your free ${APP_NAME} listing for ${communities[0].name}`;

    const intro =
      `${multi ? 'Your communities are' : `${communities[0].name} is`} listed on CareLinkAI, the ` +
      `senior-care discovery platform helping Greater Cleveland families find assisted living and memory care.`;
    const ask = multi
      ? `Claim each free listing (about 2 minutes each) to manage the profile, add photos and details, and respond to family inquiries:`
      : `Claim your free listing in about 2 minutes to manage your profile, add photos and details, and respond to family inquiries:`;

    // ----- plain text -----
    const textLines = communities.map((c) => `• ${c.name}: ${c.claimUrl}`).join('\n');
    const text =
      `${intro}\n\n${ask}\n\n${textLines}\n\n` +
      `There is no cost to claim or to keep a listing. If you're not the right person, please ` +
      `forward this to whoever manages marketing or admissions.\n\n` +
      `---\n` +
      `${APP_NAME} · ${args.postalAddress}\n` +
      `Unsubscribe (you won't be emailed about these listings again): ${args.unsubscribeUrl}`;

    // ----- html -----
    const ctas = communities
      .map(
        (c) =>
          `<p style="margin:10px 0"><a href="${escapeHtml(c.claimUrl)}" style="display:inline-block;background:#0d9488;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">Claim ${escapeHtml(c.name)}</a></p>`,
      )
      .join('\n');
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
  <p>${escapeHtml(intro)}</p>
  <p>${escapeHtml(ask)}</p>
  ${ctas}
  <p style="color:#6b7280;font-size:13px">There is no cost to claim or to keep a listing. If you're not the right person, please forward this to whoever manages marketing or admissions.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
  <p style="color:#9ca3af;font-size:12px">
    ${APP_NAME} · ${escapeHtml(args.postalAddress)}<br/>
    <a href="${escapeHtml(args.unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe</a> — you won't be emailed about these listings again.
  </p>
</body></html>`;

    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [args.toEmail],
      replyTo: OUTREACH_REPLY_TO,
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<${args.unsubscribeUrl}>, <mailto:${FROM_EMAIL}?subject=unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    if (error) {
      console.error('[Resend] Error sending directory claim invite:', error);
      captureError(
        error instanceof Error ? error : new Error(String((error as { message?: string })?.message ?? error)),
        { tags: { feature: 'directory-claim-invite' }, extra: { toEmail: args.toEmail, count: communities.length } }
      );
      return false;
    }
    console.log('[Resend] ✅ Directory claim invite sent. Email ID:', data?.id);
    return true;
  } catch (error) {
    console.error('[Resend] Exception sending directory claim invite:', error);
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'directory-claim-invite' },
      extra: { toEmail: args.toEmail },
    });
    return false;
  }
}

/**
 * Generate HTML content for verification email
 */
function generateVerificationEmailHTML(
  firstName: string,
  verificationLink: string
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f5f5f5;
      margin: 0;
      padding: 0;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
    }
    .content h2 {
      color: #1f2937;
      font-size: 24px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .content p {
      color: #4b5563;
      margin-bottom: 16px;
      font-size: 16px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .verify-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);
      transition: transform 0.2s;
    }
    .verify-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(59, 130, 246, 0.4);
    }
    .info-box {
      background-color: #f3f4f6;
      border-left: 4px solid #3b82f6;
      padding: 16px;
      margin: 24px 0;
      border-radius: 4px;
    }
    .info-box p {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 8px 0;
      font-size: 14px;
      color: #6b7280;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    .link-text {
      word-break: break-all;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${APP_NAME}</h1>
    </div>
    
    <div class="content">
      <h2>Verify Your Email Address</h2>
      
      <p>Hello ${firstName},</p>
      
      <p>Thank you for registering with ${APP_NAME}! We're excited to have you join our community.</p>
      
      <p>To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
      
      <div class="button-container">
        <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
      </div>
      
      <div class="info-box">
        <p><strong>⏱️ This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.</strong></p>
      </div>
      
      <p>If you did not create an account with ${APP_NAME}, please disregard this email. No further action is required.</p>
      
      <p>Best regards,<br>The ${APP_NAME} Team</p>
    </div>
    
    <div class="footer">
      <p>Having trouble clicking the button?</p>
      <p>Copy and paste this URL into your browser:</p>
      <p class="link-text">${verificationLink}</p>
      <p style="margin-top: 20px;">
        &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text content for verification email
 */
function generateVerificationEmailText(
  firstName: string,
  verificationLink: string
): string {
  return `
Hello ${firstName},

Thank you for registering with ${APP_NAME}! We're excited to have you join our community.

To complete your registration and activate your account, please verify your email address by clicking the link below:

${verificationLink}

⏱️ This verification link will expire in ${TOKEN_EXPIRY_HOURS} hours.

If you did not create an account with ${APP_NAME}, please disregard this email. No further action is required.

Best regards,
The ${APP_NAME} Team

---
© ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  `.trim();
}

/**
 * Send a password reset email (for future use)
 * 
 * @param email - User's email address
 * @param firstName - User's first name
 * @param resetToken - Password reset token
 * @returns Promise<boolean> - true if email sent successfully
 */
export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string
): Promise<boolean> {
  try {
    console.log(`[Resend] Sending password reset email to ${email}`);
    
    if (!process.env.RESEND_API_KEY) {
      console.error('[Resend] RESEND_API_KEY is not configured');
      return false;
    }
    
    const APP_URL = process.env.NEXTAUTH_URL || 'https://getcarelinkai.com';
    const resetLink = `${APP_URL}/auth/reset-password?token=${resetToken}`;
    
    const { data, error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [email],
      subject: `Reset Your ${APP_NAME} Password`,
      html: `
        <p>Hello ${firstName},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Hello ${firstName},\n\nReset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
    });
    
    if (error) {
      console.error('[Resend] Error sending password reset email:', error);
      return false;
    }
    
    console.log('[Resend] ✅ Password reset email sent');
    return true;
    
  } catch (error) {
    console.error('[Resend] Exception sending password reset:', error);
    return false;
  }
}
