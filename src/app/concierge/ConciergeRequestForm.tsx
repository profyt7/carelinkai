'use client';

import { useEffect, useState } from 'react';
import type { PayerSource } from '@/lib/payer/payer-source';
import { CONCIERGE_REQUEST_API } from '@/lib/concierge/screener';
import { CONCIERGE_CHECKOUT_API, CONCIERGE_OFFER, CONCIERGE_OFFER_API, ctaLabelFor, type ConciergeCtaMode } from '@/lib/concierge/offer';

/**
 * Intake form inside the paid offer (sprint W4 0a, W5-3). Only rendered after a
 * private-pay / LTC / not-sure screener answer. The CTA depends on the server:
 *   checkout → "Book the concierge — <price>" → Stripe Checkout redirect
 *   request  → "Request the concierge" (flag unset) → unpaid queue row
 *   waitlist → "Fully booked this month — join the waitlist" → same intake, WAITLIST
 */
export default function ConciergeRequestForm({ payerSource }: { payerSource: PayerSource }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'waitlisted' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  // Until the server answers, the safe default is the unpaid request path.
  const [mode, setMode] = useState<ConciergeCtaMode>('request');
  const [modeLoaded, setModeLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(CONCIERGE_OFFER_API, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j && (j.mode === 'checkout' || j.mode === 'request' || j.mode === 'waitlist')) setMode(j.mode);
      })
      .catch(() => undefined)
      .finally(() => alive && setModeLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      payerSource,
      contactName: String(f.get('contactName') || ''),
      contactEmail: String(f.get('contactEmail') || ''),
      contactPhone: String(f.get('contactPhone') || ''),
      location: String(f.get('location') || ''),
      careNeeds: String(f.get('careNeeds') || ''),
      timeline: String(f.get('timeline') || ''),
      notes: String(f.get('notes') || ''),
      company_url: String(f.get('company_url') || ''),
    };
    setState('submitting');
    setError(null);
    try {
      const api = mode === 'checkout' ? CONCIERGE_CHECKOUT_API : CONCIERGE_REQUEST_API;
      let res = await fetch(api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      let data = await res.json().catch(() => ({}));
      // Checkout not available after all (flag flipped / Stripe down) → fall back to the request path.
      if (!res.ok && mode === 'checkout' && data?.fallback === 'request') {
        res = await fetch(CONCIERGE_REQUEST_API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        data = await res.json().catch(() => ({}));
      }
      if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
      if (data?.url) {
        window.location.assign(data.url as string);
        return;
      }
      setState(data?.waitlisted || data?.orderStatus === 'WAITLIST' ? 'waitlisted' : 'done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div data-testid="concierge-request-success" className="rounded-xl border border-success-200 bg-success-50 p-5">
        <p className="font-semibold text-neutral-900">Got it — a Cleveland person will call you within one business day.</p>
        <p className="mt-1 text-sm text-neutral-700">
          Your request is in our concierge queue. Nothing is charged until we have spoken and you decide to go ahead;
          the fee is {CONCIERGE_OFFER.priceLine}, and {CONCIERGE_OFFER.guarantee.toLowerCase()}
        </p>
      </div>
    );
  }
  if (state === 'waitlisted') {
    return (
      <div data-testid="concierge-waitlist-success" className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="font-semibold text-neutral-900">You’re on the waitlist — nothing has been charged.</p>
        <p className="mt-1 text-sm text-neutral-700">
          We take a small number of family searches each month so every one gets a person. We’ll email you as soon as a
          slot opens; the free directory and guides are yours in the meantime.
        </p>
      </div>
    );
  }

  const input =
    'mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-primary-500 focus:ring-primary-500';

  return (
    <form onSubmit={onSubmit} data-testid="concierge-request-form" data-mode={mode} data-mode-loaded={modeLoaded ? 'true' : 'false'} className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
      <h4 className="text-lg font-bold text-neutral-900">{mode === 'checkout' ? 'Book the concierge' : mode === 'waitlist' ? 'Join the waitlist' : 'Request the concierge'}</h4>
      <p className="mt-1 text-sm text-neutral-600">Two minutes. A person reads this — no bots, no resale.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Your name *</span>
          <input name="contactName" required minLength={2} maxLength={120} className={input} autoComplete="name" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Email *</span>
          <input name="contactEmail" type="email" required maxLength={254} className={input} autoComplete="email" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Phone</span>
          <input name="contactPhone" type="tel" maxLength={40} className={input} autoComplete="tel" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">City or ZIP to search near</span>
          <input name="location" maxLength={120} className={input} placeholder="e.g. Westlake or 44145" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-neutral-800">What care is needed? *</span>
          <textarea
            name="careNeeds"
            required
            minLength={5}
            maxLength={2000}
            rows={3}
            className={input}
            placeholder="e.g. Mom has early dementia and needs help with medications and meals; walks with a walker."
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Timeline</span>
          <select name="timeline" className={input} defaultValue="">
            <option value="">Choose…</option>
            <option value="urgent">This week (hospital discharge)</option>
            <option value="2-4 weeks">2–4 weeks</option>
            <option value="1-3 months">1–3 months</option>
            <option value="researching">Just researching</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Anything else?</span>
          <input name="notes" maxLength={2000} className={input} placeholder="Veteran, languages, pets…" />
        </label>
      </div>
      <div className="hidden" aria-hidden="true">
        <label>
          Company URL
          <input name="company_url" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={state === 'submitting'}
        data-testid="concierge-request-cta"
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {state === 'submitting' ? 'Sending…' : ctaLabelFor(mode)}
      </button>
      <p className="mt-3 text-xs text-neutral-500">
        {mode === 'checkout'
          ? 'Secure payment by Stripe. ' + CONCIERGE_OFFER.guarantee + ' '
          : 'Nothing is charged now. '}
        We keep what you tell us in-app and never email it to a facility. No marketing email, ever.
      </p>
    </form>
  );
}
