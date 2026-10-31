/**
 * OL-248 — what the Founding Operator card promises. Only tools verified to work with production flags as
 * they are (no subscription plan, OPERATOR_PLANS off, no outbound SMS). Each line names the code path
 * that serves it; nothing here is plan-gated. No fixed free duration, no "unlimited", no "full access",
 * no "priority support", no future discounts.
 */

export const FOUNDING_OPERATOR_HEADLINE = 'Founding Operator — Free listing. No credit card required.';

export const FOUNDING_OPERATOR_TOOLS = [
  // api/operator/homes/[id]/claim (role only), api/operator/homes/[id] PATCH, api/operator/homes/[id]/photos
  'Claim and edit your listing, with photos',
  // api/operator/homes/[id]/generate-profile (role only)
  'An AI-drafted description of your community that you can edit',
  // api/inquiries POST → sendNewLeadOperatorEmail; api/operator/inquiries (role only)
  'Family inquiries in your inbox, with an email alert for each new one',
  // api/inquiries/[id]/generate-response (role only; sendEmail → inquiryEmailService)
  'AI-drafted replies you review and send to families by email',
  // api/operator/tours/[id]/confirm (PERMISSIONS.TOURS_CONFIRM for OPERATOR) → sendTourConfirmationEmail
  'Tour requests you confirm, with a confirmation email to the family',
  // api/operator/inquiries/pipeline, api/operator/analytics/export (role only)
  'Your inquiry pipeline and analytics, with a CSV export',
  // api/operator/homes/[id]/licenses, api/operator/homes/[id]/inspections (role only)
  'Your Ohio license and state inspection history on your listing',
  // api/operator/caregivers/[id]/hire (role only; the fee runs only with MARKETPLACE_HIRE_FEE, off)
  'Hire caregivers from the marketplace, with no hire fee',
  'Direct founder support',
] as const;
