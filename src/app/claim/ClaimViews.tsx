/**
 * Server-rendered views for /claim (no hooks, no client JS). Brand kit: primary blue
 * (#3978FC), neutral greys. Mobile-first: one column, full-width buttons on small screens.
 * No PHI: facility name, city, one public photo and links — nothing about residents or families.
 */
import Link from 'next/link';
import { COMPANY_EMAIL } from '@/lib/contact';
import ClaimPhoto from './ClaimPhoto';

export function ClaimShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[70vh] bg-neutral-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-6 py-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-mark.png" alt="" width={28} height={28} className="h-7 w-7" />
          <span className="font-semibold text-neutral-900">CareLinkAI</span>
        </div>
        {children}
      </div>
    </main>
  );
}

function ContactLine() {
  return (
    <p className="mt-4 text-sm text-neutral-600" data-testid="claim-contact">
      Reply to the email you received, or contact{' '}
      <a href={`mailto:${COMPANY_EMAIL}`} className="font-medium text-primary-600 hover:underline">{COMPANY_EMAIL}</a>
      {' '}and we&rsquo;ll send you a fresh link.
    </p>
  );
}

export type ClaimProblemKind = 'invalid' | 'expired' | 'not_found' | 'claimed' | 'wrong_account';

export function ClaimProblem({ kind, homeName, signedInAs, signedInAsRecipient }: {
  kind: ClaimProblemKind;
  homeName?: string;
  signedInAs?: string;
  signedInAsRecipient?: boolean;
}) {
  const copy: Record<ClaimProblemKind, { title: string; body: string }> = {
    invalid: { title: 'This claim link isn’t valid', body: 'The link may be incomplete or was changed after it was sent.' },
    expired: { title: 'This claim link has expired', body: 'Claim links stay active for 45 days. Yours has run out — we can send a new one.' },
    not_found: { title: 'We couldn’t find this listing', body: 'It may have been removed or merged with another listing.' },
    claimed: {
      title: 'This listing has already been claimed',
      body: signedInAsRecipient
        ? `${homeName ?? 'This listing'} is already on your account — you’ll find it in your operator dashboard.`
        : `${homeName ?? 'This listing'} is already managed by an account on CareLinkAI. If that should be you, we can help.`,
    },
    wrong_account: {
      title: 'This link is for a different account',
      body: `You’re signed in as ${signedInAs ?? 'another account'}, but this claim link for ${homeName ?? 'the listing'} was sent to a different email address. Sign out and open the link again, or forward it to that inbox.`,
    },
  };
  const { title, body } = copy[kind];
  return (
    <ClaimShell>
      <div className="px-6 py-8 text-center" data-testid={`claim-problem-${kind}`}>
        <h1 className="text-xl font-semibold text-neutral-900 sm:text-2xl">{title}</h1>
        <p className="mt-3 text-neutral-700">{body}</p>
        {kind === 'claimed' && signedInAsRecipient ? (
          <Link href="/operator" className="btn btn-primary mt-6 w-full py-3 text-base sm:w-auto">Go to your dashboard</Link>
        ) : (
          <ContactLine />
        )}
      </div>
    </ClaimShell>
  );
}

export function ClaimLanding({ token, homeId, homeName, city, state, photoUrl }: {
  token: string;
  homeId: string;
  homeName: string;
  city: string | null;
  state: string | null;
  photoUrl: string | null;
}) {
  const place = [city, state].filter(Boolean).join(', ');
  const registerHref = `/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`;
  const signInHref = `/auth/login?callbackUrl=${encodeURIComponent(`/claim?token=${token}`)}`;
  return (
    <ClaimShell>
      {photoUrl && <ClaimPhoto src={photoUrl} alt={homeName} />}
      <div className="px-6 py-7">
        <p className="text-sm font-medium uppercase tracking-wide text-primary-600">Your CareLinkAI listing</p>
        <h1 className="mt-1 text-2xl font-bold text-neutral-900 sm:text-3xl">Claim {homeName}</h1>
        {place && <p className="mt-1 text-neutral-600" data-testid="claim-place">{place}</p>}
        <Link href={`/homes/${homeId}`} className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline">
          View the public listing →
        </Link>
        <p className="mt-5 text-neutral-700">
          Claiming lets you update your photos, pricing and availability so families see accurate information — and it&rsquo;s free.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={registerHref} className="btn btn-primary w-full py-3 text-base sm:w-auto" data-testid="claim-create-account">
            Create your free account
          </Link>
          <Link href={signInHref} className="text-center text-sm font-medium text-primary-600 hover:underline sm:ml-2" data-testid="claim-sign-in">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </ClaimShell>
  );
}
