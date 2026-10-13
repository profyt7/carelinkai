/**
 * One-tap availability ping — PURE helpers (sprint W4-1). No DB, no network,
 * so every rule here is unit-tested in isolation:
 *
 *   - `parsePingReply(raw)`: a bare integer (or "none"/"full") → count;
 *     STOP words → opt-out; anything else → admin review. Never throws.
 *   - `extractReplyText(body)`: the operator's own words from an email reply
 *     (quoted history and signatures stripped) before parsing.
 *   - `renderPingEmail(...)`: the one-line email with the 0–5 one-tap links,
 *     an "other number" link, a STOP link and the CAN-SPAM footer (postal
 *     address + unsubscribe). Business data only, never PHI.
 *
 * Feature flags (all unset = OFF — nothing sends on deploy):
 *   PING_ENABLED      gates the weekly cron entirely;
 *   SMS_PING_ENABLED  gates the SMS *stub* — no provider is wired either way.
 */

import { MAX_AVAILABILITY_COUNT, AVAILABILITY_FRESH_DAYS } from '@/lib/availability/availability';

export const PING_SOURCE = 'PING' as const;
/** A ping with no reply after this many days is EXPIRED (= the Verified badge's own freshness window). */
export const PING_EXPIRY_DAYS = AVAILABILITY_FRESH_DAYS;
/** Skip a contact whose home was verified this recently (weekly cadence, no double-pinging). */
export const PING_SKIP_IF_VERIFIED_DAYS = 3;
export const PING_ONE_TAP_COUNTS = [0, 1, 2, 3, 4, 5] as const;

export function pingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env['PING_ENABLED'] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}
export function smsPingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = (env['SMS_PING_ENABLED'] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export type PingReply =
  | { kind: 'count'; count: number }
  | { kind: 'stop' }
  | { kind: 'admin_review'; reason: string };

const STOP_WORDS = new Set(['STOP', 'STOPALL', 'STOP ALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'OPT OUT', 'OPTOUT', 'REMOVE ME']);
const ZERO_WORDS = new Set(['NONE', 'NO', 'ZERO', 'FULL', 'NO BEDS', 'NO OPENINGS', 'WE ARE FULL', "WE'RE FULL", 'FULL.', 'NONE.']);
const COUNT_RE = /^(\d{1,3})\s*(?:beds?|openings?|open|available|rooms?|spots?)?\s*[.!]?$/i;

/** Parse one reply. Exported rules, see module doc. */
export function parsePingReply(raw: string | null | undefined): PingReply {
  const text = (raw ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return { kind: 'admin_review', reason: 'empty' };
  const upper = text.toUpperCase().replace(/[.!]+$/, '').trim();
  if (STOP_WORDS.has(upper)) return { kind: 'stop' };
  if (ZERO_WORDS.has(upper)) return { kind: 'count', count: 0 };
  const m = text.match(COUNT_RE);
  if (m) {
    const n = parseInt(m[1] as string, 10);
    if (Number.isFinite(n) && n <= MAX_AVAILABILITY_COUNT) return { kind: 'count', count: n };
    return { kind: 'admin_review', reason: 'out_of_range' };
  }
  return { kind: 'admin_review', reason: 'unparseable' };
}

/**
 * The operator's own words from an inbound email body: stop at the first quoted
 * line / "On … wrote:" / signature delimiter, take the first non-empty line.
 */
export function extractReplyText(body: string | null | undefined): string {
  const lines = (body ?? '').replace(/\r\n?/g, '\n').split('\n');
  const own: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^>/.test(t)) break;
    if (/^on .+wrote:$/i.test(t)) break;
    if (/^-{2,}\s*(original message|forwarded message)?\s*-*$/i.test(t) || t === '--') break;
    if (/^(from|sent|to|subject):\s/i.test(t) && own.length > 0) break;
    own.push(t);
  }
  return (own.find((l) => l.length > 0) ?? '').trim();
}

export type PingEmailInput = {
  facilityName: string;
  contactName?: string | null;
  /** Absolute app URL, no trailing slash. */
  appUrl: string;
  token: string;
  postalAddress: string;
};

export function pingReplyUrl(appUrl: string, token: string, reply?: string | number): string {
  const q = new URLSearchParams({ token });
  if (reply !== undefined) q.set('reply', String(reply));
  return `${appUrl}/availability/ping?${q.toString()}`;
}
export function pingUnsubscribeUrl(appUrl: string, token: string): string {
  return `${appUrl}/api/availability/ping/unsubscribe?token=${encodeURIComponent(token)}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function pingSubject(facilityName: string): string {
  return `Open beds this week at ${facilityName}?`;
}

/** The one line the brief specifies — identical in SMS (stub) and email. */
export function pingLine(facilityName: string): string {
  return `Open beds this week at ${facilityName}? Reply with a number (0 is fine). Reply STOP to opt out.`;
}

/** Plain-text + HTML bodies. Both carry the CAN-SPAM footer. */
export function renderPingEmail(i: PingEmailInput): { subject: string; text: string; html: string; unsubscribeUrl: string } {
  const line = pingLine(i.facilityName);
  const unsubscribeUrl = pingUnsubscribeUrl(i.appUrl, i.token);
  const stopUrl = pingReplyUrl(i.appUrl, i.token, 'STOP');
  const otherUrl = pingReplyUrl(i.appUrl, i.token);
  const greeting = i.contactName ? `Hi ${i.contactName.split(' ')[0]},` : 'Hi,';

  const text =
    `${greeting}\n\n${line}\n\n` +
    `One tap:\n` +
    PING_ONE_TAP_COUNTS.map((n) => `  ${n} open: ${pingReplyUrl(i.appUrl, i.token, n)}`).join('\n') +
    `\n  Another number: ${otherUrl}\n\n` +
    `This updates the "Verified Availability" badge on your free CareLinkAI listing for ${i.facilityName}. ` +
    `Business info only — no resident data.\n\n` +
    `CareLinkAI · ${i.postalAddress}\n` +
    `Stop these pings (opt out): ${stopUrl}\n` +
    `Unsubscribe: ${unsubscribeUrl}\n`;

  const buttons = PING_ONE_TAP_COUNTS.map(
    (n) =>
      `<a href="${escapeHtml(pingReplyUrl(i.appUrl, i.token, n))}" style="display:inline-block;margin:0 6px 8px 0;padding:10px 16px;border-radius:8px;background:#3978FC;color:#fff;text-decoration:none;font-weight:600;font-size:15px">${n}</a>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.55;font-size:15px">
  <p style="margin:0 0 14px">${escapeHtml(greeting)}</p>
  <p style="margin:0 0 14px"><strong>${escapeHtml(line)}</strong></p>
  <p style="margin:0 0 6px;color:#6b7280;font-size:13px">One tap — open beds right now:</p>
  <p style="margin:0 0 14px">${buttons}<a href="${escapeHtml(otherUrl)}" style="display:inline-block;margin:0 6px 8px 0;padding:10px 16px;border-radius:8px;border:1px solid #d1d5db;color:#1f2937;text-decoration:none;font-size:15px">Another number</a></p>
  <p style="margin:0 0 14px;color:#6b7280;font-size:13px">This updates the &quot;Verified Availability&quot; badge on your free CareLinkAI listing for ${escapeHtml(i.facilityName)}. Business info only &mdash; no resident data.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0"/>
  <p style="color:#9ca3af;font-size:12px;line-height:1.5">
    CareLinkAI &middot; ${escapeHtml(i.postalAddress)}<br/>
    <a href="${escapeHtml(stopUrl)}" style="color:#9ca3af">Stop these pings</a> &middot;
    <a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe</a> &mdash; you won't receive availability pings again.
  </p>
</body></html>`;

  return { subject: pingSubject(i.facilityName), text, html, unsubscribeUrl };
}
