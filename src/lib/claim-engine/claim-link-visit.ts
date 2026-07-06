/**
 * OL-117: claim-link visit recorder.
 *
 * Claim tokens are stateless signed payloads — minting leaves no trace, which
 * made "has the operator opened their link?" unanswerable (the Maplewood
 * audit-trail drift, 2026-07-06). This records ONE append-only row per
 * valid-token render of a claim surface: timestamp + homeId + token email +
 * surface. Nothing more, no update path.
 *
 * Failure policy: recording must NEVER block or break the claim page render —
 * errors go to Sentry and the visitor proceeds.
 */

import { prisma } from '@/lib/prisma';
import { captureError } from '@/lib/sentry';

export type ClaimLinkVisitSource = 'claim_page' | 'register_page';

export async function recordClaimLinkVisit(args: {
  homeId: string;
  operatorEmail: string;
  source: ClaimLinkVisitSource;
}): Promise<void> {
  try {
    await prisma.claimLinkVisit.create({
      data: {
        homeId: args.homeId,
        operatorEmail: args.operatorEmail.toLowerCase(),
        source: args.source,
      },
    });
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { feature: 'claim-link-visit' },
      // homeId only — no email/PII in the error context.
      extra: { source: args.source, homeId: args.homeId },
    });
  }
}
