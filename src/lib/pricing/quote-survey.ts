/**
 * Post-tour family QUOTE survey trigger (OL-111). Fires after an inquiry is marked
 * TOUR_COMPLETED — but ONLY when FAMILY_QUOTE_SURVEY_ENABLED is truthy (OFF by
 * default, so a redeploy can never silently start surveying families). Sends a
 * tokenized no-login link. Fire-and-forget; never throws; PHI-safe (link only).
 */

import { prisma } from '@/lib/prisma';
import { signQuoteToken } from './quote-token';
import { sendQuoteSurveyEmail } from '@/lib/email';
import { captureError } from '@/lib/sentry';

export function quoteSurveyEnabled(): boolean {
  const v = (process.env['FAMILY_QUOTE_SURVEY_ENABLED'] || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export async function maybeSendQuoteSurvey(inquiryId: string): Promise<void> {
  try {
    if (!quoteSurveyEnabled()) return; // trigger PAUSED by default (OL-111)
    const secret = process.env['NEXTAUTH_SECRET'];
    if (!secret) return;
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      select: {
        id: true,
        homeId: true,
        contactEmail: true,
        home: { select: { name: true } },
        family: { select: { user: { select: { email: true } } } },
      },
    });
    if (!inquiry?.homeId) return;
    const to = inquiry.family?.user?.email || inquiry.contactEmail;
    if (!to) return;
    const base = (process.env['NEXT_PUBLIC_APP_URL'] || process.env['NEXTAUTH_URL'] || 'https://getcarelinkai.com').replace(/\/$/, '');
    const surveyUrl = `${base}/quote/report?token=${encodeURIComponent(signQuoteToken(inquiry.homeId, secret, { inquiryId: inquiry.id }))}`;
    await sendQuoteSurveyEmail({ toEmail: to, facilityName: inquiry.home?.name || 'the community', surveyUrl });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { tags: { feature: 'quote-survey' }, extra: { inquiryId } });
  }
}
