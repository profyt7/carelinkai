'use client';

import { useState } from 'react';

/**
 * No-login +/- counter for the email magic-link availability updater. Posts the new
 * count + the signed token to /api/availability/update. Business data only — no PHI.
 */
export default function AvailabilityCounter({
  token,
  facilityName,
  initialCount,
}: {
  token: string;
  facilityName: string;
  initialCount: number | null;
}) {
  const [count, setCount] = useState<number>(initialCount ?? 0);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  async function save() {
    setStatus('saving');
    setError('');
    try {
      const res = await fetch('/api/availability/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, count }),
      });
      const data = await res.json();
      if (res.ok && data.ok) setStatus('saved');
      else {
        setError(data.error || 'Could not save. Please try again.');
        setStatus('error');
      }
    } catch {
      setError('Network error. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'saved') {
    return (
      <div className="text-center">
        <div className="text-4xl mb-3">✅</div>
        <h2 className="text-lg font-semibold text-neutral-900">Thank you — availability updated</h2>
        <p className="mt-2 text-sm text-neutral-600">
          {facilityName} now shows <strong>{count} opening{count === 1 ? '' : 's'}</strong>, verified today.
          Families searching your area will see it as freshly confirmed.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold text-neutral-900">How many openings does {facilityName} have right now?</h2>
      <p className="mt-1 text-sm text-neutral-500">Tap to set the number, then confirm. No login needed.</p>

      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label="Decrease"
          onClick={() => setCount((c) => Math.max(0, c - 1))}
          className="h-12 w-12 rounded-full border border-neutral-300 text-2xl font-medium text-neutral-700 hover:bg-neutral-50"
        >
          −
        </button>
        <div className="min-w-[4rem] text-5xl font-bold tabular-nums text-neutral-900">{count}</div>
        <button
          type="button"
          aria-label="Increase"
          onClick={() => setCount((c) => Math.min(999, c + 1))}
          className="h-12 w-12 rounded-full border border-neutral-300 text-2xl font-medium text-neutral-700 hover:bg-neutral-50"
        >
          +
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-error-600">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={status === 'saving'}
        className="mt-8 inline-flex items-center justify-center rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {status === 'saving' ? 'Saving…' : `Confirm ${count} opening${count === 1 ? '' : 's'}`}
      </button>
    </div>
  );
}
