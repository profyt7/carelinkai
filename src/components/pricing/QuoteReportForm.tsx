'use client';

import { useState } from 'react';

/**
 * No-login post-tour quote survey (OL-111). Captures the actual quote a family got —
 * base + care add-on + community fee + care level. NO PHI (no diagnoses / medical
 * detail). Posts to /api/pricing/quote-report with the signed token.
 */
const CARE_LEVELS = [
  { value: 'ASSISTED', label: 'Assisted Living' },
  { value: 'MEMORY_CARE', label: 'Memory Care' },
  { value: 'INDEPENDENT', label: 'Independent Living' },
  { value: 'SKILLED_NURSING', label: 'Skilled Nursing' },
];

export default function QuoteReportForm({ token, facilityName }: { token: string; facilityName: string }) {
  const [careLevel, setCareLevel] = useState('ASSISTED');
  const [base, setBase] = useState('');
  const [addOn, setAddOn] = useState('');
  const [fee, setFee] = useState('');
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  async function submit() {
    if (!base) { setError('Please enter the monthly base quote.'); return; }
    setStatus('saving');
    setError('');
    try {
      const res = await fetch('/api/pricing/quote-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          careLevel,
          quotedMonthlyBase: base,
          careAddOn: addOn || null,
          communityFee: fee || null,
          moveInMonth: month || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) setStatus('saved');
      else { setError(data.error || 'Could not submit. Please try again.'); setStatus('error'); }
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'saved') {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">🙏</div>
        <h2 className="text-lg font-semibold text-neutral-900">Thank you</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Your report helps other families budget for {facilityName}. We review submissions before
          showing an average — and we never share your name or any personal details.
        </p>
      </div>
    );
  }

  const field = 'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm';
  return (
    <div>
      <h2 className="text-lg font-semibold text-neutral-900">What did {facilityName} quote you?</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Ranges help other families budget. Please don&apos;t include any medical or personal details.
      </p>

      <div className="mt-5 space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Care level</label>
          <select value={careLevel} onChange={(e) => setCareLevel(e.target.value)} className={field}>
            {CARE_LEVELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Monthly base rate ($) *</label>
          <input inputMode="numeric" value={base} onChange={(e) => setBase(e.target.value)} placeholder="5500" className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Care add-on ($/mo)</label>
            <input inputMode="numeric" value={addOn} onChange={(e) => setAddOn(e.target.value)} placeholder="optional" className={field} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Community fee ($)</label>
            <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="optional" className={field} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1">Move-in month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className={field} />
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-error-600">{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={status === 'saving'}
        className="mt-6 w-full rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {status === 'saving' ? 'Submitting…' : 'Share this quote'}
      </button>
    </div>
  );
}
