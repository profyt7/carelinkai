'use client';

/**
 * Accept / Decline form for /facility/respond. Decline reasons are a fixed
 * list (acuity sub-reasons included); "Other" needs a few words.
 */

import { useEffect, useState } from 'react';
import { DECLINE_REASONS } from '@/lib/concierge/facility-response';

type Summary = { careLevel: string; payerLane: string; timeline: string };
type Result = { ok: true; status: 'ACCEPTED' | 'DECLINED' } | { ok: false; error: string; status?: string };

export default function FacilityRespondClient({ token, facilityName, summary }: { token: string; facilityName: string; summary: Summary }) {
  const [mode, setMode] = useState<'choose' | 'decline'>('choose');
  const [reason, setReason] = useState<string>('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  async function submit(action: 'accept' | 'decline') {
    setBusy(true);
    try {
      const r = await fetch('/api/facility/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action, reason: action === 'decline' ? reason : undefined, text: action === 'decline' ? text : undefined }),
      });
      const j = (await r.json().catch(() => ({ ok: false, error: 'network' }))) as Result;
      setResult(j);
    } catch {
      setResult({ ok: false, error: 'network' });
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    if (result.ok) {
      return (
        <div className="text-center" data-testid="facility-result" data-status={result.status}>
          <div className="text-4xl mb-3">{result.status === 'ACCEPTED' ? '✅' : '🙏'}</div>
          <h2 className="text-lg font-semibold text-neutral-900">{result.status === 'ACCEPTED' ? 'Accepted — thank you' : 'Declined — thank you for telling us why'}</h2>
          <p className="mt-2 text-sm text-neutral-600">
            {result.status === 'ACCEPTED'
              ? `CareLinkAI will confirm the details with the discharge planner and coordinate the move-in for ${facilityName}.`
              : 'We use the reason to stop sending you placements that do not fit.'}
          </p>
        </div>
      );
    }
    return (
      <div className="text-center" data-testid="facility-result" data-status="error" data-error={result.error}>
        <h2 className="text-lg font-semibold text-neutral-900">{result.error === 'already_answered' ? 'Already answered' : 'Could not save'}</h2>
        <p className="mt-2 text-sm text-neutral-600">{result.error === 'already_answered' ? 'This link was already used. Each placement can be answered once.' : 'Please reply to the email instead.'}</p>
      </div>
    );
  }

  return (
    <div data-testid="facility-form" data-hydrated={hydrated ? 'true' : 'false'}>
      <h2 className="text-lg font-semibold text-neutral-900">Can {facilityName} accept this placement?</h2>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">Care level</dt><dd className="font-semibold text-neutral-900" data-testid="summary-care-level">{summary.careLevel}</dd></div>
        <div className="rounded-lg bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">Payer</dt><dd className="font-semibold text-neutral-900" data-testid="summary-payer">{summary.payerLane}</dd></div>
        <div className="rounded-lg bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">Timeline</dt><dd className="font-semibold text-neutral-900" data-testid="summary-timeline">{summary.timeline}</dd></div>
      </dl>

      {mode === 'choose' ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" disabled={busy || !hydrated} onClick={() => void submit('accept')} className="rounded-lg bg-success-600 py-3 text-white font-semibold hover:bg-success-700 disabled:opacity-50" data-testid="facility-accept">
            Accept
          </button>
          <button type="button" disabled={busy || !hydrated} onClick={() => setMode('decline')} className="rounded-lg border border-neutral-300 py-3 font-semibold text-neutral-800 hover:bg-neutral-50 disabled:opacity-50" data-testid="facility-decline">
            Decline…
          </button>
        </div>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (reason) void submit('decline');
          }}
        >
          <label className="block text-sm font-medium text-neutral-800">Why not? (helps us stop sending placements that do not fit)</label>
          <select value={reason} onChange={(e) => setReason(e.target.value)} required className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" data-testid="facility-decline-reason">
            <option value="">Pick a reason…</option>
            {DECLINE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={reason === 'OTHER' ? 'Please say why (required)' : 'Anything else? (optional)'} className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" data-testid="facility-decline-text" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('choose')} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">Back</button>
            <button type="submit" disabled={busy || !reason || (reason === 'OTHER' && text.trim().length < 3)} className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white disabled:opacity-50" data-testid="facility-decline-submit">
              Send decline
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
