/**
 * OL-184 — server-side SMS opt-in recorder. Stores consent on the immutable
 * LeadConsent table (consentTextVersion = an "sms-…" key, contactPhone = the
 * number, userId / inquiryId refs, ip + user agent, consentAt timestamp).
 *
 * Policy:
 * - Checked → one row with consentGiven=true.
 * - Unchecked on a lead form → no row (nothing to prove; the number is not
 *   opted in).
 * - Unchecked on an account form where the user had opted in → one
 *   consentGiven=false row (the revocation is evidence too).
 * Like recordLeadConsent, failures never block the form: logged to Sentry
 * without PII, null returned.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import {
  CURRENT_SMS_CONSENT_VERSION,
  SmsConsentPayload,
  isKnownSmsConsentVersion,
} from './sms-consent';

export interface RecordSmsConsentArgs {
  /** Raw `smsConsent` payload from the client; absent/malformed → not given. */
  consent: unknown;
  /** SMS_CONSENT_FORMS.* */
  sourceForm: string;
  /** The number the consent covers. No number → nothing is recorded. */
  phone?: string | null;
  req?: NextRequest | Request | null;
  userId?: string | null;
  inquiryId?: string | null;
  /** Other lead artifact (e.g. the concierge PlacementSearch id), plain string. */
  leadId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  /** Account forms: record an explicit opt-out when a prior opt-in exists. */
  recordRevocation?: boolean;
}

export function normalizeSmsConsent(consent: unknown): SmsConsentPayload {
  if (consent && typeof consent === 'object') {
    const c = consent as Record<string, unknown>;
    return {
      given: c.given === true,
      textVersion: isKnownSmsConsentVersion(c.textVersion) ? c.textVersion : CURRENT_SMS_CONSENT_VERSION,
    };
  }
  return { given: false, textVersion: CURRENT_SMS_CONSENT_VERSION };
}

function requestIp(req: RecordSmsConsentArgs['req']): string | null {
  if (!req) return null;
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

/** The user's current SMS opt-in state: their latest SMS consent row. */
export async function getSmsConsentState(
  userId: string
): Promise<{ given: boolean; at: Date | null; phone: string | null }> {
  const row = await prisma.leadConsent.findFirst({
    where: { userId, consentTextVersion: { startsWith: 'sms-' } },
    orderBy: { consentAt: 'desc' },
    select: { consentGiven: true, consentAt: true, contactPhone: true },
  });
  return { given: row?.consentGiven ?? false, at: row?.consentAt ?? null, phone: row?.contactPhone ?? null };
}

export async function recordSmsConsent(args: RecordSmsConsentArgs): Promise<string | null> {
  try {
    const { given, textVersion } = normalizeSmsConsent(args.consent);
    const phone = args.phone?.trim() || null;

    if (!given) {
      if (!args.recordRevocation || !args.userId) return null;
      const prior = await getSmsConsentState(args.userId);
      if (!prior.given) return null;
    } else if (!phone) {
      return null; // consent to text a number nobody gave us proves nothing
    }

    const row = await prisma.leadConsent.create({
      data: {
        consentGiven: given,
        consentTextVersion: textVersion,
        sourceForm: args.sourceForm,
        sourceUrl: args.req?.headers.get('referer') ?? null,
        ip: requestIp(args.req),
        userAgent: args.req?.headers.get('user-agent')?.slice(0, 500) ?? null,
        contactName: args.contactName ?? null,
        contactEmail: args.contactEmail ?? null,
        contactPhone: phone,
        userId: args.userId ?? null,
        inquiryId: args.inquiryId ?? null,
        leadId: args.leadId ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'sms-consent' },
      extra: { sourceForm: args.sourceForm },
    });
    return null;
  }
}

/**
 * Account forms (settings, onboarding): the box mirrors the saved state, so a
 * save records an opt-in when checked and a revocation when a prior opt-in is
 * unchecked. Does nothing when the form did not send `smsConsent` at all.
 * `phone` undefined → the user's stored phone.
 */
export async function recordAccountSmsConsent(args: {
  consent: unknown;
  sourceForm: string;
  userId: string;
  phone?: string | null;
  req?: NextRequest | Request | null;
}): Promise<string | null> {
  if (args.consent === undefined) return null;
  let phone = args.phone;
  if (phone === undefined) {
    try {
      const u = await prisma.user.findUnique({ where: { id: args.userId }, select: { phone: true } });
      phone = u?.phone ?? null;
    } catch {
      phone = null;
    }
  }
  return recordSmsConsent({
    consent: args.consent,
    sourceForm: args.sourceForm,
    phone,
    req: args.req,
    userId: args.userId,
    recordRevocation: true,
  });
}
