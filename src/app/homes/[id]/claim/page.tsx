import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { listingClaimState } from '@/lib/claims/self-serve';
import { registerUrlWithIntent, signClaimIntent } from '@/lib/claims/claim-intent';
import { ClaimListingButton } from '@/components/homes/ListingClaim';
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/lib/contact';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Claim this listing', robots: { index: false, follow: false } };

/**
 * /homes/[id]/claim (fix/self-serve-claim). Signed out: sign up with the home carried through (a signed,
 * short-lived claim intent the register API redeems) or log in and come back here. Signed-in operator: one
 * click. Every claim waits for an admin to verify it; ownership never moves on its own.
 */
export default async function ClaimListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const home = await prisma.assistedLivingHome.findUnique({
    where: { id },
    select: { id: true, name: true, address: { select: { city: true, state: true } }, operator: { select: { user: { select: { email: true } } } } },
  });
  if (!home) notFound();

  const state = await listingClaimState({ id: home.id, operatorEmail: home.operator?.user?.email });
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? null;
  const place = [home.address?.city, home.address?.state].filter(Boolean).join(', ');
  const card = 'mx-auto max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm';

  return (
    <main className="min-h-[70vh] bg-neutral-50 px-4 py-12" data-testid="claim-listing-page" data-claim-state={state}>
      <div className={card}>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Claim this listing</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900">{home.name}</h1>
        {place && <p className="text-sm text-neutral-600">{place}</p>}

        {state === 'claimed' && (
          <p className="mt-5 text-neutral-700" data-testid="claim-page-managed">
            This listing is managed by its community.{' '}
            <Link href="/contact" className="font-medium text-primary-700 underline">Questions? Contact us</Link>
          </p>
        )}

        {state === 'pending' && (
          <p className="mt-5 text-neutral-700" data-testid="claim-page-pending">
            A claim for this listing is under review.{' '}
            <Link href="/contact" className="font-medium text-primary-700 underline">Questions? Contact us</Link>
          </p>
        )}

        {state === 'open' && role === 'OPERATOR' && (
          <div className="mt-5 space-y-3" data-testid="claim-page-operator">
            <p className="text-neutral-700">Claim your free listing. We verify every claim, then email you when it&apos;s yours.</p>
            <ClaimListingButton homeId={home.id} role={role} />
          </div>
        )}

        {state === 'open' && session && role !== 'OPERATOR' && (
          <p className="mt-5 text-neutral-700" data-testid="claim-page-wrong-role">
            Claims need a care-home operator account. Questions? Call{' '}
            <a href={CONTACT_PHONE_TEL} className="font-medium text-primary-700 underline">{CONTACT_PHONE_DISPLAY}</a>.
          </p>
        )}

        {state === 'open' && !session && (
          <div className="mt-5 space-y-3" data-testid="claim-page-signed-out">
            <p className="text-neutral-700">Create your free operator account and we&apos;ll file the claim for this listing. We verify every claim, then email you when it&apos;s yours.</p>
            <Link
              href={registerUrlWithIntent(signClaimIntent(home.id, process.env['NEXTAUTH_SECRET'] ?? ''))}
              className="flex w-full items-center justify-center rounded-lg bg-primary-600 px-4 py-3 font-semibold text-white hover:bg-primary-700"
              data-testid="claim-page-register"
            >
              Create a free operator account
            </Link>
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent(`/homes/${home.id}/claim`)}`}
              className="flex w-full items-center justify-center rounded-lg border border-neutral-300 px-4 py-3 font-semibold text-neutral-800 hover:bg-neutral-50"
              data-testid="claim-page-login"
            >
              I already have an operator account
            </Link>
          </div>
        )}

        <p className="mt-6 text-xs text-neutral-500">
          Free listing, no credit card. <Link href={`/homes/${home.id}`} className="underline">Back to the listing</Link>
        </p>
      </div>
    </main>
  );
}
