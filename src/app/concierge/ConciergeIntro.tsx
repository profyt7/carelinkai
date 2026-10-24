'use client';

import { useState } from 'react';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import type { ConciergeRoute } from '@/lib/concierge/screener';
import ConciergeScreener from './ConciergeScreener';
import { HERO_BAND } from '@/components/site/brand';

/**
 * Hero + screener for /concierge (OL-166b). The default hero (the paid offer's
 * headline and guarantee subhead) is server-rendered as before; once the
 * screener answers Medicaid / Medicare / VA the hero swaps to the free-lane
 * version so that lane never sees a dollar figure — not the headline's mistake,
 * not the price. "Not sure" and private-pay keep the default hero.
 */
export default function ConciergeIntro() {
  const [route, setRoute] = useState<ConciergeRoute | null>(null);
  const freeLane = route === 'free_help';

  return (
    <>
      <section className={HERO_BAND} data-testid="concierge-hero" data-lane={freeLane ? 'free' : 'default'}>
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 md:py-16">
          <p className="text-sm font-semibold text-primary-700 uppercase tracking-wide">
            {freeLane ? 'Free help · Greater Cleveland' : 'Family Concierge · Greater Cleveland'}
          </p>
          {/* "Free for families" stays above the fold (OL-165 a). */}
          <p
            className="mt-3 inline-flex items-center rounded-full border border-success-200 bg-success-50 px-4 py-2 text-sm font-semibold text-success-800"
            data-testid="concierge-free-for-families"
          >
            {freeLane ? 'Free for families. Always — no fee to you, none to the home.' : CONCIERGE_OFFER.freeForFamiliesLine}
          </p>
          <h1 className="mt-5 text-4xl sm:text-5xl font-bold text-neutral-900 leading-tight" data-testid="concierge-headline">
            {freeLane ? CONCIERGE_OFFER.freeLaneHeadline : CONCIERGE_OFFER.headline}
          </h1>
          <p className="mt-4 text-xl font-semibold text-primary-700 max-w-3xl" data-testid="concierge-subhead">
            {freeLane ? CONCIERGE_OFFER.freeLaneSubhead : CONCIERGE_OFFER.subhead}
          </p>
          {freeLane ? (
            <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
              When care is paid through Medicaid, Medicare or the VA, CareLinkAI never charges you or the home. The
              directory below shows which homes are taking new Medicaid Assisted Living Waiver residents, what each
              program covers, and how to contact a home directly.
            </p>
          ) : (
            <>
              <p className="mt-6 text-lg text-neutral-700 max-w-3xl">
                A hospital gives you 48 hours. In that window families pick a home that can’t handle the care, sign a
                contract they haven’t read, or run out of money in a place that won’t keep them. A Cleveland person
                checks fit, prices and the contract with you before you sign — verified homes only, availability
                confirmed before you visit, the real price in writing.
              </p>
              <p className="mt-4 text-neutral-700 max-w-3xl">
                The concierge is a <strong>private-pay service</strong>. If care will be paid through Medicaid, Medicare
                or the VA, CareLinkAI’s help is always free — the screener below sends you straight there.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Screener → offer / free help */}
      <section id="screener" className="max-w-3xl mx-auto px-6 py-16 scroll-mt-16">
        <ConciergeScreener onRoute={setRoute} />
      </section>
    </>
  );
}
