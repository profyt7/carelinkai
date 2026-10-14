'use client';

import { useEffect, useState } from 'react';
import { AGENCY_SERVICE_TYPES, CLEVELAND_AGENCIES } from '@/lib/claim-engine/cohorts';

/**
 * "Claim your agency listing" form (sprint W3 item 2). Posts to
 * /api/claim/request, tagged cohort=CLEVELAND_AGENCIES. When the visitor
 * arrived through a cohort claim link, `token` rides along so the server
 * records the claim as source 'claim_link'.
 *
 * No email is sent on submit — the request lands in the ClaimRequest table
 * for founder follow-up.
 */
export default function AgencyClaimForm({ token, tokenEmail }: { token?: string; tokenEmail?: string }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>([]);
  // The submit button stays disabled until React has hydrated: a click on the
  // server-rendered button before that would do a NATIVE form submit (GET with
  // the fields in the URL) instead of the fetch below.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  function toggleService(s: string) {
    setServices((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      cohort: CLEVELAND_AGENCIES,
      orgName: String(form.get('orgName') || ''),
      contactName: String(form.get('contactName') || ''),
      contactEmail: String(form.get('contactEmail') || ''),
      phone: String(form.get('phone') || ''),
      website: String(form.get('website') || ''),
      city: String(form.get('city') || ''),
      serviceTypes: services,
      message: String(form.get('message') || ''),
      company_url: String(form.get('company_url') || ''),
      token: token || undefined,
    };
    setState('submitting');
    setError(null);
    try {
      const res = await fetch('/api/claim/request', {
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
      <div data-testid="agency-claim-success" className="rounded-2xl border border-success-200 bg-success-50 p-8 text-center">
        <h3 className="text-2xl font-bold text-neutral-900">Thanks — your claim request is in.</h3>
        <p className="mt-3 text-neutral-700">
          We review every agency by hand and will reach out from CareLinkAI to confirm your
          listing details. Nothing goes live until you have approved it.
        </p>
      </div>
    );
  }

  const input =
    'mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 shadow-sm focus:border-primary-500 focus:ring-primary-500';

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8 shadow-sm" data-testid="agency-claim-form">
      {tokenEmail && (
        <p className="mb-4 rounded-lg bg-primary-50 px-4 py-3 text-sm text-primary-800">
          You opened a claim link addressed to <strong>{tokenEmail}</strong>. Submit below to claim
          your agency listing.
        </p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-neutral-800">Agency name *</span>
          <input name="orgName" required minLength={2} maxLength={200} className={input} autoComplete="organization" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Your name</span>
          <input name="contactName" maxLength={120} className={input} autoComplete="name" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Work email *</span>
          <input
            name="contactEmail"
            type="email"
            required
            maxLength={254}
            defaultValue={tokenEmail || ''}
            className={input}
            autoComplete="email"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Phone</span>
          <input name="phone" type="tel" maxLength={40} className={input} autoComplete="tel" />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-neutral-800">Website</span>
          <input name="website" type="url" maxLength={300} className={input} placeholder="https://" autoComplete="url" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-neutral-800">City / main service area</span>
          <input name="city" maxLength={120} className={input} placeholder="e.g. Lakewood, Parma, East Side" />
        </label>
      </div>

      <fieldset className="mt-6">
        <legend className="text-sm font-medium text-neutral-800">Services you offer</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {AGENCY_SERVICE_TYPES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={services.includes(s)}
                onChange={() => toggleService(s)}
                className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-6 block">
        <span className="text-sm font-medium text-neutral-800">Anything we should know?</span>
        <textarea name="message" rows={3} maxLength={2000} className={input} placeholder="Counties covered, hiring right now, languages spoken…" />
      </label>

      {/* Honeypot — hidden from people, filled by bots. */}
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
        disabled={!hydrated || state === 'submitting'}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
      >
        {state === 'submitting' ? 'Sending…' : 'Claim your agency listing'}
      </button>
      <p className="mt-3 text-xs text-neutral-500">
        Free to claim and keep. We never share your contact details, and we do not send
        marketing email — a person from CareLinkAI follows up.
      </p>
    </form>
  );
}
