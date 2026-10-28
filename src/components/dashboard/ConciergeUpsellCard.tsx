'use client';

/**
 * Family dashboard concierge card (sprint W5-3, G1 f; W5 follow-up). The server
 * decides which card (GET /api/family/concierge-upsell):
 *  - 'paid'  — the "$399 flat" card for private / LTC lanes with no active order;
 *  - 'both'  — not sure / unanswered: the FREE-help card first, with the
 *              concierge as one secondary line (never led with a price);
 *  - 'free'  — Medicaid / Medicare / VA: "Free help for your situation", never
 *              the paid one.
 * Dismiss hides the paid / both card for 30 days (stored per user).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, HeartHandshake } from 'lucide-react';
import { WAIVER_DIRECTORY_PATH } from '@/lib/concierge/screener';
import { CONCIERGE_OFFER } from '@/lib/concierge/offer';

type Card = 'paid' | 'both' | 'free' | null;

export default function ConciergeUpsellCard() {
  const [card, setCard] = useState<Card | 'loading'>('loading');

  useEffect(() => {
    let alive = true;
    fetch('/api/family/concierge-upsell', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setCard(j?.card === 'paid' || j?.card === 'free' || j?.card === 'both' ? j.card : null))
      .catch(() => alive && setCard(null));
    return () => {
      alive = false;
    };
  }, []);

  async function dismiss() {
    setCard(null);
    try {
      await fetch('/api/family/concierge-upsell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dismiss: true }) });
    } catch {
      /* best effort */
    }
  }

  if (card === 'loading' || card === null) return null;

  if (card === 'free' || card === 'both') {
    const both = card === 'both';
    return (
      <div className="mb-6 rounded-xl border border-success-200 bg-success-50 p-5" data-testid="concierge-free-card" data-variant={card}>
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-success-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <HeartHandshake size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-neutral-900">{both ? 'Free help first' : 'Free help for your situation'}</h3>
            <p className="text-sm text-neutral-700 mt-1">
              {both
                ? `${CONCIERGE_OFFER.notSureLine} Searching and contacting homes on CareLinkAI is free for every family. Start with the directory, the homes taking new Medicaid waiver residents, and the guides on what each program covers.`
                : 'When care is paid through Medicaid, Medicare or the VA, CareLinkAI never charges you or the home. Start with the homes taking new Medicaid waiver residents, and the guides on what each program covers.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
              {both && <Link href="/cleveland" className="text-success-800 hover:underline">Browse the free directory →</Link>}
              <Link href={WAIVER_DIRECTORY_PATH} className="text-success-800 hover:underline">Homes accepting the Medicaid waiver →</Link>
              <Link href="/learn/guides/what-medicare-covers" className="text-success-800 hover:underline">What Medicare covers →</Link>
              <Link href="/learn/guides/veterans-benefits-assisted-living" className="text-success-800 hover:underline">VA benefits →</Link>
            </div>
            {both && (
              <p className="mt-3 text-xs text-neutral-600" data-testid="concierge-both-secondary">
                Paying privately and want a person to check fit, prices and the contract with you?{' '}
                <Link href="/concierge" data-testid="concierge-both-cta" className="font-semibold text-primary-700 hover:underline">
                  The optional Family Concierge is {CONCIERGE_OFFER.priceDisplay} flat →
                </Link>
              </p>
            )}
          </div>
          {both && (
            <button type="button" onClick={dismiss} aria-label="Dismiss for 30 days" data-testid="concierge-both-dismiss" className="rounded-full p-1 text-neutral-500 hover:bg-success-100 hover:text-neutral-800">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-primary-200 bg-primary-50 p-5" data-testid="concierge-paid-card">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Sparkles size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {/* OL-165 c: one line + the guarantee (private lanes only; the server never sends this card to a free lane). */}
          <h3 className="font-bold text-neutral-900">Family Concierge — {CONCIERGE_OFFER.priceDisplay} flat, one time</h3>
          <p className="text-sm text-neutral-700 mt-1">
            {CONCIERGE_OFFER.oneLine} <strong>{CONCIERGE_OFFER.guarantee}</strong>
          </p>
          <Link href="/concierge" data-testid="concierge-paid-card-cta" className="mt-3 inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
            See the Family Concierge →
          </Link>
        </div>
        <button type="button" onClick={dismiss} aria-label="Dismiss for 30 days" data-testid="concierge-paid-card-dismiss" className="rounded-full p-1 text-neutral-500 hover:bg-primary-100 hover:text-neutral-800">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
