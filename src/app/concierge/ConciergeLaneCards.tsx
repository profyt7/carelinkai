'use client';

import ConciergeTerms from '@/components/concierge/ConciergeTerms';
import Link from 'next/link';
import { FiArrowRight, FiCheck, FiPhone } from 'react-icons/fi';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import { CONCIERGE_INCLUDED_SUMMARY } from '@/lib/concierge/faq';
import { WAIVER_DIRECTORY_PATH, type ConciergeRoute } from '@/lib/concierge/screener';
import { CONTACT_NO_PHI_LINE, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/lib/contact';
import { BTN_PRIMARY, BTN_SECONDARY, CARD, EYEBROW } from '@/components/site/brand';

/**
 * OL-174 — the two lanes as two clear cards, side by side: the free Medicaid /
 * Medicare / VA lane and the private-pay Family Concierge.
 *
 * Price rules (OL-165 / OL-166b) are unchanged:
 *  - no answer yet (server HTML) → both cards, and the private-pay card shows
 *    NO price ("shown after the payer question"), so the server HTML carries
 *    no dollar figure;
 *  - private pay / LTC insurance, or not sure → both cards (free card first),
 *    the price rendered client-side from CONCIERGE_OFFER;
 *  - Medicaid / Medicare / VA → the private-pay card is not rendered at all —
 *    that family never sees a price.
 * No literal dollar amount in this file: offer.ts owns the number.
 */
export default function ConciergeLaneCards({ route }: { route: ConciergeRoute | null }) {
  const freeOnly = route === 'free_help';
  const showPrice = route === 'private_pay' || route === 'both';

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-12" data-testid="concierge-lanes" data-lane={freeOnly ? 'free' : 'both'}>
      <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
        {freeOnly ? 'Your help is free' : 'Two ways we help — pick the one that fits how care is paid'}
      </h2>
      <div className={`mt-6 grid grid-cols-1 gap-6 ${freeOnly ? '' : 'md:grid-cols-2'}`}>
        {/* Free lane: Medicaid / Medicare / VA. */}
        <article className={`${CARD} flex flex-col p-6 sm:p-8 border-success-200`} data-testid="concierge-lane-free">
          <p className="text-sm font-semibold uppercase tracking-wide text-success-700">Medicaid · Medicare · VA</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-neutral-900">Free help</h3>
            <span className="rounded-full border border-success-200 bg-success-50 px-3 py-1 text-sm font-semibold text-success-800">
              Free — always
            </span>
          </div>
          <p className="mt-3 text-neutral-700">{CONCIERGE_OFFER.freeLaneSubhead}</p>
          <ul className="mt-5 space-y-3">
            {[
              'The verified Cleveland directory — ODH inspection facts and direct contact with each home',
              'Homes accepting new Medicaid Assisted Living Waiver residents',
              'Plain-English guides to Ohio Medicaid waivers, Medicare and VA benefits',
            ].map((line) => (
              <li key={line} className="flex gap-3">
                <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                <span className="text-neutral-700">{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6 flex flex-wrap gap-3">
            <Link href={WAIVER_DIRECTORY_PATH} className={BTN_PRIMARY} data-testid="concierge-lane-free-waiver">
              Homes taking the Medicaid waiver
              <FiArrowRight aria-hidden="true" />
            </Link>
            <Link href="/cleveland" className={BTN_SECONDARY} data-testid="concierge-lane-free-directory">
              Browse the directory
            </Link>
          </div>
        </article>

        {/* Private-pay lane: never rendered once a Medicaid / Medicare / VA answer is given. */}
        {!freeOnly && (
          <article
            className={`${CARD} flex flex-col p-6 sm:p-8 ${route === 'private_pay' ? 'border-primary-500 ring-1 ring-primary-500/30' : ''}`}
            data-testid="concierge-lane-private"
            data-price-shown={showPrice ? 'true' : 'false'}
          >
            <p className={EYEBROW}>Private pay only</p>
            <h3 className="mt-2 text-2xl font-bold text-neutral-900">Family Concierge</h3>
            <p className="mt-3 text-neutral-700">{CONCIERGE_OFFER.oneLine}</p>
            <ul className="mt-5 space-y-3">
              {CONCIERGE_INCLUDED_SUMMARY.map((line) => (
                <li key={line} className="flex gap-3">
                  <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
                  <span className="text-neutral-700">{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl bg-primary-50 px-4 py-3" data-testid="concierge-lane-price">
              {showPrice ? (
                <>
                  <p className="text-2xl font-bold text-primary-700">{CONCIERGE_OFFER.priceDisplay}</p>
                  <p className="text-xs text-neutral-600">flat · one-time · per family search · private pay only</p>
                </>
              ) : (
                <p className="text-sm text-neutral-700">
                  A flat, one-time fee, shown after the payer question below — private pay only. Free when Medicaid,
                  Medicare or the VA pays.
                </p>
              )}
            </div>
            {/* Pay when ready (10/31): the deal, next to the CTA. The price stays behind the payer question. */}
            <p className="mt-4 font-semibold text-primary-700" data-testid="concierge-lane-promise">
              {CONCIERGE_OFFER.subhead}
            </p>
            {showPrice ? (
              <ConciergeTerms className="mt-1 text-sm text-neutral-700" testId="concierge-lane-terms" />
            ) : (
              <p className="mt-1 text-sm text-neutral-700">
                {CONCIERGE_OFFER.guarantee} {CONCIERGE_OFFER.notAPlacementLine}
              </p>
            )}
            <div className="mt-auto pt-6">
              <a href="#screener" className={BTN_PRIMARY} data-testid="concierge-lane-private-cta">
                {route ? 'Go to the request form' : 'Start with one question'}
                <FiArrowRight aria-hidden="true" />
              </a>
              <p className="mt-4 text-sm text-neutral-700" data-testid="concierge-lane-phone">
                <FiPhone aria-hidden="true" className="mr-1 inline" />
                Prefer to talk? Call{' '}
                <a href={CONTACT_PHONE_TEL} className="font-semibold text-primary-700 hover:underline">
                  {CONTACT_PHONE_DISPLAY}
                </a>
                . {CONTACT_NO_PHI_LINE}
              </p>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
