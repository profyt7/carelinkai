import type { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { CONTACT_NO_PHI_LINE, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/lib/contact';
import { isShortlistVisibleToFamily, verifyShortlistToken } from '@/lib/concierge/shortlist-token';

/**
 * A family's Family Concierge shortlist (pay when ready, 10/31). Reached only from the signed link in the
 * "your shortlist" email. Renders the shortlist ONLY when the order is marked PAID and an admin released it;
 * otherwise a plain "not available yet" with no data. Public, noindex, never cached.
 */

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your shortlist — Family Concierge',
  robots: { index: false, follow: false },
};

type Curated = { homeId?: string; name?: string; address?: string; note?: string; confirmedAvailability?: string };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-neutral-50" data-testid="concierge-shortlist-page">
      <section className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Family Concierge</p>
        {children}
        <p className="mt-8 text-sm text-neutral-600">
          Questions? Call{' '}
          <a href={CONTACT_PHONE_TEL} className="font-semibold text-primary-700 hover:underline">
            {CONTACT_PHONE_DISPLAY}
          </a>
          . {CONTACT_NO_PHI_LINE}
        </p>
      </section>
    </div>
  );
}

export default async function ConciergeShortlistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const secret = process.env['NEXTAUTH_SECRET'];
  const payload = secret ? verifyShortlistToken(decodeURIComponent(token), secret) : null;
  const order = payload
    ? await prisma.conciergeOrder.findUnique({
        where: { id: payload.orderId },
        select: { status: true, shortlistReleasedAt: true, placementSearch: { select: { curatedHomes: true, conciergeNote: true } } },
      })
    : null;

  if (!payload || !order) {
    return (
      <Shell>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900" data-testid="concierge-shortlist-invalid">This link isn&apos;t valid.</h1>
        <p className="mt-4 text-neutral-700">Please use the link in your most recent email from us, or call us and we&apos;ll resend it.</p>
      </Shell>
    );
  }

  if (!isShortlistVisibleToFamily(order)) {
    return (
      <Shell>
        <h1 className="mt-2 text-3xl font-bold text-neutral-900" data-testid="concierge-shortlist-locked">Your shortlist isn&apos;t available yet.</h1>
        <p className="mt-4 text-neutral-700">
          We release the full shortlist as soon as your payment is received. If you&apos;ve already paid, it&apos;s on its way — we&apos;ll email you.
        </p>
      </Shell>
    );
  }

  const homes = (Array.isArray(order.placementSearch?.curatedHomes) ? order.placementSearch!.curatedHomes : []) as Curated[];
  return (
    <Shell>
      <h1 className="mt-2 text-3xl font-bold text-neutral-900">Your shortlist</h1>
      <p className="mt-3 text-neutral-700">{CONCIERGE_OFFER.notAPlacementLine}</p>
      {order.placementSearch?.conciergeNote && (
        <div className="mt-6 rounded-xl border border-primary-200 bg-white p-5 text-neutral-800 whitespace-pre-line" data-testid="concierge-shortlist-note">
          {order.placementSearch.conciergeNote}
        </div>
      )}
      <ol className="mt-6 space-y-4" data-testid="concierge-shortlist-homes">
        {homes.map((h, i) => (
          <li key={h.homeId ?? i} className="rounded-xl border border-neutral-200 bg-white p-5" data-testid="concierge-shortlist-home">
            <p className="text-lg font-semibold text-neutral-900">
              {i + 1}. {h.name ?? 'Home'}
            </p>
            {h.address && <p className="text-sm text-neutral-600">{h.address}</p>}
            <p className="mt-2 text-sm" data-testid="concierge-shortlist-availability">
              {h.confirmedAvailability ? (
                <>
                  <span className="font-semibold text-success-700">Availability — verified by our team:</span> {h.confirmedAvailability}
                </>
              ) : (
                <>
                  <span className="font-semibold text-amber-700">Availability — unconfirmed.</span> Ask the home before you visit.
                </>
              )}
            </p>
            {h.note && <p className="mt-2 text-sm text-neutral-700 whitespace-pre-line">{h.note}</p>}
            {h.homeId && (
              <Link href={`/homes/${h.homeId}`} className="mt-3 inline-block text-sm font-semibold text-primary-700 hover:underline">
                See the listing — prices there are labeled verified or unconfirmed →
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Shell>
  );
}
