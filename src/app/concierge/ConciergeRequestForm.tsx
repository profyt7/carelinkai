'use client';

import { useState } from 'react';
import type { PayerSource } from '@/lib/payer/payer-source';
import { CONCIERGE_REQUEST_API } from '@/lib/concierge/screener';

/**
 * "Request concierge help" (sprint W4 0a). Only rendered inside the private-pay
 * offer (after a FEE_ELIGIBLE screener answer). Posts to the existing DP
 * concierge queue tagged source=concierge_page with the screener answer.
 */
export default function ConciergeRequestForm({ payerSource }: { payerSource: PayerSource }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch(CONCIERGE_REQUEST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
      setState('done');
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
          Your request is in our concierge queue. Nothing is billed to you, ever; the flat fee is confirmed with you
          before any work starts and is paid by the facility after a confirmed move-in.
        </p>
      </div>
    );
  }

  const input =
    'mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-primary-500 focus:ring-primary-500';

  return (
    <form onSubmit={onSubmit} data-testid="concierge-request-form" className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
      <h4 className="text-lg font-bold text-neutral-900">Request concierge help</h4>
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
        {state === 'submitting' ? 'Sending…' : 'Request concierge help'}
      </button>
      <p className="mt-3 text-xs text-neutral-500">
        We keep what you tell us in-app and never email it to a facility. No marketing email, ever.
      </p>
    </form>
  );
}
