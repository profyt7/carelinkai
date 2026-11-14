import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { inspectClaimToken } from '@/lib/claim-token';
import { recordClaimLinkVisit } from '@/lib/claim-engine/claim-link-visit';
import { COHORT_LANDING_PATH, isClaimCohort } from '@/lib/claim-engine/cohorts';
import ClaimConfirm from './ClaimConfirm';
import { ClaimLanding, ClaimProblem, ClaimShell } from './ClaimViews';

/**
 * Public claim landing — the target of claim-link emails (/claim?token=...). One operator can
 * claim several seeded listings (each link carries its own home's signed token).
 *
 *   - invalid / tampered token     → friendly notice + how to reach us
 *   - expired token                → friendly "this link has expired" notice + how to reach us
 *   - cohort token (no homeId)     → the cohort landing page with the token (sprint W3 item 2)
 *   - valid; listing already claimed → friendly notice (signed in as the recipient: go to dashboard)
 *   - valid; NOT signed in         → branded landing: "Claim <facility>", city, photo, public-listing
 *                                    link, one line on what claiming does, "Create your free account"
 *                                    (register with the token; email prefilled + locked to the
 *                                    recipient) and "Already have an account? Sign in" (back here).
 *   - signed in as a DIFFERENT user → notice (use the addressed inbox)
 *   - signed in as the recipient   → confirm, then the onboarding claim step (image-rights ack)
 * Every valid token records a claim-link visit (OL-117; wanted). No PHI anywhere on the page.
 */

export const dynamic = 'force-dynamic';

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

function safePhotoUrl(url: string | null | undefined): string | null {
  return url && /^https:\/\//i.test(url) ? url : null;
}

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ token?: string }> | { token?: string } }) {
  const token = (await searchParams)?.token ?? null;
  const inspected = inspectClaimToken(token, process.env['NEXTAUTH_SECRET'] || '');

  // Cohort claim link (no home to claim): hand off to the cohort landing page.
  if (inspected.state === 'valid' && !inspected.payload.homeId && isClaimCohort(inspected.payload.cohort)) {
    redirect(`${COHORT_LANDING_PATH[inspected.payload.cohort]}?token=${encodeURIComponent(token as string)}#claim`);
  }
  if (inspected.state === 'expired') return <ClaimProblem kind="expired" />;
  if (inspected.state !== 'valid' || !inspected.payload.homeId) return <ClaimProblem kind="invalid" />;

  const payload = inspected.payload;
  const homeId = payload.homeId as string;

  // OL-117: durable "the link was opened" evidence for outreach follow-ups (wanted).
  // Fire-and-forget — recording never blocks or breaks the render.
  void recordClaimLinkVisit({ homeId, operatorEmail: payload.operatorEmail, source: 'claim_page' });

  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: homeId },
    select: {
      id: true,
      name: true,
      address: { select: { city: true, state: true } },
      photos: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }], take: 1, select: { url: true } },
      operator: { select: { user: { select: { email: true } } } },
    },
  });
  if (!home) return <ClaimProblem kind="not_found" />;

  const session = await getServerSession(authOptions);
  const signedInEmail = session?.user?.email?.toLowerCase() ?? null;
  const recipient = payload.operatorEmail.toLowerCase();

  // Only claimable while still owned by the directory sentinel (unclaimed).
  const ownerEmail = (home.operator?.user?.email || '').toLowerCase();
  if (ownerEmail !== DIRECTORY_UNCLAIMED_EMAIL) {
    return <ClaimProblem kind="claimed" homeName={home.name} signedInAsRecipient={signedInEmail === recipient} />;
  }

  if (!signedInEmail) {
    return (
      <ClaimLanding
        token={token as string}
        homeId={home.id}
        homeName={home.name}
        city={home.address?.city ?? null}
        state={home.address?.state ?? null}
        photoUrl={safePhotoUrl(home.photos[0]?.url)}
      />
    );
  }

  if (signedInEmail !== recipient) {
    return <ClaimProblem kind="wrong_account" homeName={home.name} signedInAs={signedInEmail} />;
  }

  return (
    <ClaimShell>
      <ClaimConfirm token={token as string} homeName={home.name} />
    </ClaimShell>
  );
}
