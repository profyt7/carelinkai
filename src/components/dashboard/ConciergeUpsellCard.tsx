'use client';

/**
 * Family dashboard concierge card (sprint W5-3, G1 f). The server decides which
 * card (GET /api/family/concierge-upsell): the paid "$399 flat" card for private /
 * LTC / unknown lanes with no active order, or the "Free help for your situation"
 * card for Medicaid / Medicare / VA lanes — never the paid one. Dismiss hides the
 * paid card for 30 days (stored per user).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, HeartHandshake } from 'lucide-react';
import { WAIVER_DIRECTORY_PATH } from '@/lib/concierge/screener';

type Card = 'paid' | 'free' | null;

export default function ConciergeUpsellCard() {
  const [card, setCard] = useState<Card | 'loading'>('loading');

  useEffect(() => {
    let alive = true;
    fetch('/api/family/concierge-upsell', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => alive && setCard(j?.card === 'paid' || j?.card === 'free' ? j.card : null))
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

  if (card === 'free') {
    return (
      <div className="mb-6 rounded-xl border border-success-200 bg-success-50 p-5" data-testid="concierge-free-card">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-lg bg-success-600 flex items-center justify-center flex-shrink-0 mt-0.5">
            <HeartHandshake size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-neutral-900">Free help for your situation</h3>
            <p className="text-sm text-neutral-700 mt-1">
              When care is paid through Medicaid, Medicare or the VA, CareLinkAI never charges you or the home. Start with
              the homes taking new Medicaid waiver residents, and the guides on what each program covers.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">
              <Link href={WAIVER_DIRECTORY_PATH} className="text-success-800 hover:underline">Homes accepting the Medicaid waiver →</Link>
              <Link href="/learn/guides/what-medicare-covers" className="text-success-800 hover:underline">What Medicare covers →</Link>
              <Link href="/learn/guides/veterans-benefits-assisted-living" className="text-success-800 hover:underline">VA benefits →</Link>
            </div>
          </div>
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
          <h3 className="font-bold text-neutral-900">Get a Cleveland concierge — $399 flat</h3>
          <p className="text-sm text-neutral-700 mt-1">
            A verified shortlist of 3–5 homes in 2 business days, tours scheduled, real prices in writing. One-time fee,
            full refund if we don’t deliver. Paying with Medicaid, Medicare or the VA? Our help is always free.
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
