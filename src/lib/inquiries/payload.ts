/**
 * Maps the listing-page "Send Inquiry" form state onto the canonical
 * POST /api/inquiries request body (see createInquirySchema in
 * src/app/api/inquiries/route.ts).
 *
 * The form previously posted `name`/`email`/`phone`/`residentName`/
 * `careNeeded`/`source:'home_detail'`, none of which match the API's Zod
 * schema, so every submission failed with `400 Validation failed`. This
 * keeps the API contract canonical and adapts the client to it.
 */

import type { LeadConsentPayload } from "@/lib/consent/lead-consent-text";

export interface InquiryFormState {
  name: string;
  email: string;
  phone: string;
  residentName: string;
  moveInTimeframe: string;
  careNeeded: string[];
  message: string;
  /** Payer-source screener (OL-114) — "" when unanswered (optional, tags only). */
  payerSource?: string;
}

export interface InquiryApiPayload {
  homeId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  careRecipientName?: string;
  careNeeds: string[];
  message?: string;
  additionalInfo?: string;
  tourDate?: string;
  source: "WEBSITE";
  consent?: LeadConsentPayload;
  payerSource?: string;
}

export function buildInquiryPayload(
  homeId: string,
  form: InquiryFormState,
  tourDateIso?: string,
  consent?: LeadConsentPayload
): InquiryApiPayload {
  const residentName = form.residentName?.trim();
  const moveInTimeframe = form.moveInTimeframe?.trim();

  return {
    homeId,
    contactName: form.name.trim(),
    contactEmail: form.email.trim(),
    contactPhone: form.phone?.trim() || undefined,
    careRecipientName: residentName || undefined,
    careNeeds: Array.isArray(form.careNeeded) ? form.careNeeded : [],
    message: form.message?.trim() || undefined,
    // Inquiry has no moveInTimeframe column, so preserve it in additionalInfo.
    additionalInfo: moveInTimeframe ? `Move-in timeframe: ${moveInTimeframe}` : undefined,
    tourDate: tourDateIso,
    source: "WEBSITE",
    // TCPA/marketing consent (both states recorded server-side; absence is
    // normalized to consentGiven=false — never blocks the inquiry).
    consent,
    // Payer-source tag (OL-114) — omitted entirely when unanswered.
    payerSource: form.payerSource || undefined,
  };
}
