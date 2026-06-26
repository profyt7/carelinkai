import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyClaimToken } from '@/lib/claim-token';
import ClaimConfirm from './ClaimConfirm';

/**
 * Public claim landing — the target of the proactive claim-nudge email links
 * (/claim?token=...). Lets ONE operator claim MULTIPLE seeded listings from a single
 * collapsed email (each link carries its own home's signed token).
 *
 * Routing:
 *   - invalid/expired token        → friendly notice
 *   - not signed in                → fall through to the existing register/redeem flow
 *                                    (/auth/register?claimToken=…) — unchanged for new operators
 *   - signed in as a DIFFERENT user → notice (use the link from the addressed inbox)
 *   - signed in as the addressed operator → confirm + re-arm seededHomeId via the existing
 *                                    /api/operator/claim, then onboarding step 2 claims it
 *                                    (with the image-rights ack). Safe: only offered when the
 *                                    home is still owned by the directory sentinel (unclaimed).
 */

export const dynamic = 'force-dynamic';

const DIRECTORY_UNCLAIMED_EMAIL = 'directory-unclaimed@carelinkai.system';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>
    </main>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <Shell>
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-3 text-slate-600">{body}</p>
      </div>
    </Shell>
  );
}

export default async function ClaimPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams?.token;
  const secret = process.env['NEXTAUTH_SECRET'] || '';
  const payload = token ? verifyClaimToken(token, secret) : null;

  if (!token || !payload || !payload.homeId) {
    return <Notice title="This link is invalid" body="The claim link is invalid or has expired. Please use the most recent email we sent, or reply to it and we’ll help." />;
  }

  const session = await getServerSession(authOptions);

  // Not signed in → preserve the existing register/redeem path verbatim (new operators
  // register + redeem here; returning operators get the register page's "already have an
  // account?" prompt and can sign in, then re-open this link to claim).
  if (!session?.user?.email) {
    redirect(`/auth/register?role=OPERATOR&claimToken=${encodeURIComponent(token)}`);
  }

  if (session.user.email.toLowerCase() !== payload.operatorEmail.toLowerCase()) {
    return (
      <Notice
        title="This link is for a different account"
        body={`This claim link is addressed to ${payload.operatorEmail}, but you’re signed in as ${session.user.email}. Sign out and open the link again, or forward it to that inbox.`}
      />
    );
  }

  const home = await prisma.assistedLivingHome.findUnique({
    where: { id: payload.homeId },
    select: { id: true, name: true, operator: { select: { user: { select: { email: true } } } } },
  });
  if (!home) {
    return <Notice title="Listing not found" body="We couldn’t find that listing — it may have been removed." />;
  }

  // Only claimable while still owned by the directory sentinel (unclaimed).
  const ownerEmail = (home.operator?.user?.email || '').toLowerCase();
  if (ownerEmail !== DIRECTORY_UNCLAIMED_EMAIL) {
    return (
      <Notice
        title="Already claimed"
        body={`${home.name} has already been claimed. If that was you, you’ll find it in your operator dashboard.`}
      />
    );
  }

  return (
    <Shell>
      <ClaimConfirm token={token} homeName={home.name} />
    </Shell>
  );
}
