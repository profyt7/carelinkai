'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { PAYER_SOURCE_OPTIONS, isPayerSource, type PayerSource } from '@/lib/payer/payer-source';
import { WAIVER_DIRECTORY_PATH, routeForPayerSource, type ConciergeRoute } from '@/lib/concierge/screener';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';
import ConciergeRequestForm from './ConciergeRequestForm';

/**
 * Payer-source screener in front of the private-pay concierge offer
 * (sprint W3 item 5, W5-3, W5 follow-up). The offer section is NOT in the
 * server HTML:
 *  - private pay / LTC insurance → the offer card (price, inclusions, form);
 *  - not sure yet → the FREE-help panel first (directory, waiver filter,
 *    guides, "if Medicaid may be involved, our help is free"), then the offer
 *    as a secondary option below it — a possibly-Medicaid family is never led
 *    with a price;
 *  - Medicaid / Medicare / VA → the free-help panel only; the offer never renders.
 *
 * No price is rendered in this file: offer.ts owns the number.
 */
export default function ConciergeScreener() {
  const [choice, setChoice] = useState<PayerSource | ''>('');
  const [route, setRoute] = useState<ConciergeRoute | null>(null);
  const [answered, setAnswered] = useState<PayerSource | null>(null);
  // Disabled until hydrated so a pre-hydration click can never submit natively.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isPayerSource(choice)) return;
    setAnswered(choice);
    setRoute(routeForPayerSource(choice));
  }

  function reset() {
    setRoute(null);
    setAnswered(null);
  }

  const changeAnswer = (
    <button type="button" onClick={reset} className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
      Change my answer
    </button>
  );

  function freeLane(payer: PayerSource, opts: { withReset: boolean }) {
    // Medicaid answer (sprint W5-2): land on the directory with "Accepts Medicaid waiver" preset.
    const medicaid = payer === 'MEDICAID_WAIVER';
    const notSure = payer === 'NOT_SURE';
    const freeLinks = medicaid
      ? [
          { href: WAIVER_DIRECTORY_PATH, label: 'Homes accepting new Medicaid Assisted Living Waiver residents (WRAAA list, Oct 2026)' },
          { href: '/learn/guides/assisted-living-cost-guide', label: 'Ohio Medicaid waiver and the real cost of assisted living' },
          { href: '/cleveland', label: 'Browse the full Cleveland directory — verified homes, ODH inspection facts, direct contact' },
        ]
      : notSure
        ? [
            { href: '/cleveland', label: 'Browse the Cleveland directory — verified homes, ODH inspection facts, direct contact' },
            { href: WAIVER_DIRECTORY_PATH, label: 'Homes accepting new Medicaid Assisted Living Waiver residents (WRAAA list, Oct 2026)' },
            { href: '/learn/guides/assisted-living-cost-guide', label: 'Ohio Medicaid waiver and the real cost of assisted living' },
            { href: '/learn/guides/what-medicare-covers', label: 'What Medicare does and doesn’t cover' },
            { href: '/learn/guides/veterans-benefits-assisted-living', label: 'VA benefits for assisted living (Aid & Attendance)' },
          ]
        : [
            { href: '/cleveland', label: 'Browse the Cleveland directory — verified homes, ODH inspection facts, direct contact' },
            { href: '/learn/guides/what-medicare-covers', label: 'What Medicare does and doesn’t cover' },
            { href: '/learn/guides/veterans-benefits-assisted-living', label: 'VA benefits for assisted living (Aid & Attendance)' },
            { href: '/learn/guides/assisted-living-cost-guide', label: 'Ohio Medicaid waiver and the real cost of assisted living' },
          ];
    const cta = medicaid
      ? { href: WAIVER_DIRECTORY_PATH, label: 'See homes accepting the Medicaid waiver' }
      : notSure
        ? { href: '/cleveland', label: 'Browse the free directory' }
        : { href: '/search', label: 'Start the free search' };
    return (
      <div data-testid="concierge-free-lane" data-lane={payer} className="rounded-2xl border border-success-200 bg-success-50 p-6 sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-success-700">Free help — always</p>
        <h3 className="mt-2 text-2xl font-bold text-neutral-900">
          {notSure ? 'Let’s figure out the paying part first — free.' : 'Your search is free on CareLinkAI. No fee, no catch.'}
        </h3>
        <p className="mt-3 text-neutral-700">
          {notSure
            ? `Most families start here. ${CONCIERGE_OFFER.notSureLine} The guides below explain how Ohio Medicaid waivers work, what Medicare does and doesn’t cover, and VA benefits — and the directory lets you contact homes directly, at no charge.`
            : 'When care is paid through Medicaid, Medicare or the VA, CareLinkAI never charges a fee to you or to the home for the placement. Everything below is free: the verified directory, inspection records, and direct contact with homes.'}
        </p>
        <ul className="mt-5 space-y-3">
          {freeLinks.map((l) => (
            <li key={l.href} className="flex gap-3">
              <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
              <Link href={l.href} className="text-primary-700 hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={cta.href}
            data-testid="concierge-free-cta"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700"
          >
            {cta.label}
            <FiArrowRight />
          </Link>
          {opts.withReset && changeAnswer}
        </div>
      </div>
    );
  }

  function offer(payer: PayerSource, opts: { secondary: boolean }) {
    return (
      <div
        data-testid="concierge-offer"
        data-secondary={opts.secondary ? 'true' : 'false'}
        className={`rounded-2xl border bg-white p-6 sm:p-8 shadow-sm ${opts.secondary ? 'mt-6 border-neutral-200' : 'border-primary-200'}`}
      >
        {opts.secondary && (
          <p className="mb-4 text-sm text-neutral-600" data-testid="concierge-secondary-lead">
            {CONCIERGE_OFFER.secondaryLead}
          </p>
        )}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
              {opts.secondary ? 'Family Concierge · optional' : 'Family Concierge · private pay'}
            </p>
            <h3 className="mt-2 text-2xl font-bold text-neutral-900">
              A person checks fit, prices and the contract with you — before you sign.
            </h3>
            <p className="mt-2 font-semibold text-primary-700" data-testid="concierge-offer-subhead">
              {CONCIERGE_OFFER.subhead}
            </p>
          </div>
          <div className="rounded-xl bg-primary-50 px-4 py-3 text-right" data-testid="concierge-price">
            <p className="text-3xl font-bold text-primary-700">{CONCIERGE_OFFER.priceDisplay}</p>
            <p className="text-xs text-neutral-600">flat · one-time · per family search</p>
          </div>
        </div>
        <p className="mt-3 text-neutral-700">
          {opts.secondary
            ? 'If it turns out you are paying privately or through long-term care insurance: a verified shortlist in 2 business days, a fit check against each home’s acceptance criteria, a Medicaid runway estimate, the real prices in writing with what to ask for, a contract red-flag review, and one thread with the discharge planner. If Medicaid, Medicare or the VA will pay, the intake call tells you so and points you back to the free help — no charge.'
            : 'For families paying privately or through long-term care insurance. In a 48-hour discharge window the expensive mistakes are the wrong-fit home, the unread contract and the price that changes after move-in. Within 2 business days you get a verified shortlist, a fit check against each home’s acceptance criteria, a Medicaid runway estimate, the real prices in writing with what to ask for, a contract red-flag review, and one thread with the discharge planner.'}
        </p>
        <p className="mt-4 text-sm font-semibold text-neutral-900">What’s included</p>
        <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="concierge-inclusions">
          {CONCIERGE_OFFER.inclusions.map((line) => (
            <li key={line} className="flex gap-3">
              <FiCheck className="mt-1 flex-shrink-0 text-success-600" />
              <span className="text-neutral-700">{line}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-success-200 bg-success-50 p-4 text-sm text-neutral-800" data-testid="concierge-guarantee">
            <strong className="text-success-800">Guarantee.</strong> {CONCIERGE_OFFER.guarantee}
          </div>
          <div className="rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700" data-testid="concierge-not-included">
            <strong className="text-neutral-900">Not included:</strong> {CONCIERGE_OFFER.notIncluded.join(' · ')}.
            <span className="block mt-1 text-xs text-neutral-500">{CONCIERGE_OFFER.capacityNote}</span>
          </div>
        </div>
        <p className="mt-4 text-xs text-neutral-500">{CONCIERGE_OFFER.honestyLine}</p>
        <p className="mt-2 text-xs text-neutral-500" data-testid="concierge-no-outcome">{CONCIERGE_OFFER.noOutcomeLine}</p>
        <ConciergeRequestForm payerSource={payer} />
        <div className="mt-4">{changeAnswer}</div>
      </div>
    );
  }

  if (route === 'free_help' && answered) return freeLane(answered, { withReset: true });

  if (route === 'private_pay' && answered) return offer(answered, { secondary: false });

  if (route === 'both' && answered) {
    // Free help first; the offer is the secondary option (never the lead).
    return (
      <div data-testid="concierge-both">
        {freeLane(answered, { withReset: false })}
        {offer(answered, { secondary: true })}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      data-testid="concierge-screener"
      data-hydrated={hydrated ? 'true' : 'false'}
      className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm"
    >
      <fieldset>
        <legend className="text-xl font-bold text-neutral-900">First, one question: how do you expect to pay for care?</legend>
        <p className="mt-2 text-sm text-neutral-600">
          There’s no wrong answer. It only decides which kind of help we show you — it never changes which homes you
          can see or contact.
        </p>
        <div className="mt-5 space-y-2">
          {PAYER_SOURCE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-neutral-800 ${
                choice === opt.value ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <input
                type="radio"
                name="payerSource"
                value={opt.value}
                checked={choice === opt.value}
                onChange={() => setChoice(opt.value)}
                className="h-4 w-4 border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={!hydrated || !choice}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        Continue
        <FiArrowRight />
      </button>
    </form>
  );
}
