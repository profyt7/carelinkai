/**
 * Shared request-body schema + helpers for the /concierge APIs (sprint W5-3):
 * /api/concierge/request (unpaid / waitlist) and /api/concierge/checkout (paid).
 * Lives outside the route files because Next only allows HTTP exports there.
 */

import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PAYER_SOURCE_VALUES } from '@/lib/payer/payer-source';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const conciergeIntakeSchema = z.object({
  payerSource: z.enum(PAYER_SOURCE_VALUES as unknown as [string, ...string[]]),
  contactName: z.string().trim().min(2).max(120),
  contactEmail: z.string().trim().toLowerCase().email().max(254),
  contactPhone: optionalText(40),
  location: optionalText(120),
  careNeeds: z.string().trim().min(5).max(2000),
  timeline: optionalText(120),
  notes: optionalText(2000),
  /** OL-184: SMS opt-in payload (SmsConsentCheckbox) — never 400s. */
  smsConsent: z.unknown().optional(),
  /** Honeypot — hidden input, people never fill it. */
  company_url: z.string().max(300).optional(),
});

export type ConciergeIntakeBody = z.infer<typeof conciergeIntakeSchema>;

export function clientIp(request: NextRequest): string {
  const xff = request.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/** Signed-in family (if any) — lets the order link to their account. Never required. */
export async function sessionUserId(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}
