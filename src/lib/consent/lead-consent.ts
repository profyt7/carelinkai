/**
 * Server-side lead-consent recorder (feat/lead-consent-capture).
 *
 * Writes an IMMUTABLE LeadConsent evidence row for a form submission — both
 * consent states, so declines are provable too. There is deliberately no
 * update or delete path for LeadConsent anywhere in the app.
 *
 * Failure policy: recording consent must NEVER block or degrade the form
 * submission itself — errors are captured to Sentry (PII-scrubbed) and null is
 * returned. The lead still goes through.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';
import { scrubPhi } from '@/lib/phi-scrubber';
import {
  CURRENT_LEAD_CONSENT_VERSION,
  LeadConsentPayload,
  isKnownLeadConsentVersion,
} from './lead-consent-text';

export interface RecordLeadConsentArgs {
  /** Raw consent payload from the client; absent/malformed → consentGiven=false. */
  consent: unknown;
  /** Stable form id (LEAD_CONSENT_FORMS.*). */
  sourceForm: string;
  /** Page the form was submitted from (referer fallback is derived from req). */
  sourceUrl?: string | null;
  /** The submitting request — for ip/userAgent/referer. */
  req?: NextRequest | Request | null;
  /** Point-in-time contact snapshot (typed into the form or from the account). */
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  /** Plain-string reference to the artifact this consent evidences. */
  inquiryId?: string | null;
  tourRequestId?: string | null;
  leadId?: string | null;
  demoRequestId?: string | null;
}

/** Parse the client consent payload defensively; anything unexpected = no consent. */
export function normalizeConsentPayload(consent: unknown): LeadConsentPayload {
  if (consent && typeof consent === 'object') {
    const c = consent as Record<string, unknown>;
    return {
      given: c.given === true,
      textVersion: isKnownLeadConsentVersion(c.textVersion)
        ? c.textVersion
        : CURRENT_LEAD_CONSENT_VERSION,
    };
  }
  return { given: false, textVersion: CURRENT_LEAD_CONSENT_VERSION };
}

function requestIp(req: RecordLeadConsentArgs['req']): string | null {
  if (!req) return null;
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip');
}

export async function recordLeadConsent(args: RecordLeadConsentArgs): Promise<string | null> {
  try {
    const { given, textVersion } = normalizeConsentPayload(args.consent);
    const row = await prisma.leadConsent.create({
      data: {
        consentGiven: given,
        consentTextVersion: textVersion,
        sourceForm: args.sourceForm,
        sourceUrl: args.sourceUrl ?? args.req?.headers.get('referer') ?? null,
        ip: requestIp(args.req),
        userAgent: args.req?.headers.get('user-agent')?.slice(0, 500) ?? null,
        contactName: args.contactName ?? null,
        contactEmail: args.contactEmail ?? null,
        contactPhone: args.contactPhone ?? null,
        inquiryId: args.inquiryId ?? null,
        tourRequestId: args.tourRequestId ?? null,
        leadId: args.leadId ?? null,
        demoRequestId: args.demoRequestId ?? null,
      },
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    // Never block the lead. Context is scrubbed — no contact PII reaches Sentry.
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'lead-consent' },
      extra: scrubPhi({ sourceForm: args.sourceForm }) as Record<string, unknown>,
    });
    return null;
  }
}
