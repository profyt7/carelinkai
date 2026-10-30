/**
 * Homepage "See CareLinkAI in action" bullets: live capabilities only. Each
 * line is checked against what gates it:
 *   - operator inquiries + shifts, the inquiry pipeline's AI-drafted replies
 *     (/api/inquiries/[id]/generate-response; needs ANTHROPIC_API_KEY, a
 *     required env var) and the family portal (search, documents tab,
 *     /messages): no flag;
 *   - operator residents: NEXT_PUBLIC_RESIDENTS_ENABLED (off only when 'false');
 *   - marketplace applications / direct hire / per-diem shifts:
 *     NEXT_PUBLIC_MARKETPLACE_ENABLED (off only when 'false'). Hiring works
 *     with MARKETPLACE_HIRE_FEE off (no fee is queued).
 * Billing and analytics are not listed: operator plans are behind
 * OPERATOR_PLANS_ENABLED.
 */

type PublicFlags = { NEXT_PUBLIC_RESIDENTS_ENABLED?: string; NEXT_PUBLIC_MARKETPLACE_ENABLED?: string };

export function demoSectionCapabilities(
  env: PublicFlags = {
    // Spelled out so Next inlines them in the client bundle.
    NEXT_PUBLIC_RESIDENTS_ENABLED: process.env.NEXT_PUBLIC_RESIDENTS_ENABLED,
    NEXT_PUBLIC_MARKETPLACE_ENABLED: process.env.NEXT_PUBLIC_MARKETPLACE_ENABLED,
  },
): string[] {
  const residentsOn = env.NEXT_PUBLIC_RESIDENTS_ENABLED !== 'false';
  const marketplaceOn = env.NEXT_PUBLIC_MARKETPLACE_ENABLED !== 'false';
  return [
    residentsOn ? 'Operator dashboard: inquiries, residents, shifts' : 'Operator dashboard: inquiries, shifts',
    'Inquiry pipeline with AI-drafted replies',
    ...(marketplaceOn ? ['Marketplace: applications, direct hire, per-diem shifts'] : []),
    'Family portal: search, documents, messaging',
  ];
}
