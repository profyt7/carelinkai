'use client';

/**
 * One-tap reply UI for /availability/ping. If the link carried a reply it is
 * submitted on mount (one tap for a human; a GET prefetch by a mail gateway
 * never changes anything). Otherwise: 0–5 buttons, a number box, and STOP.
 */

import { useEffect, useRef, useState } from 'react';

type Result =
  | { ok: true; kind: 'count'; count: number; facilityName: string }
  | { ok: true; kind: 'stop'; facilityName: string }
  | { ok: true; kind: 'admin_review'; facilityName: string }
  | { ok: false; error: string; parsedCount?: number | null };

export default function PingReplyClient({ token, facilityName, initialReply }: { token: string; facilityName: string; initialReply: string | null }) {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [other, setOther] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const fired = useRef(false);

  async function submit(reply: string) {
    setBusy(true);
    try {
      const r = await fetch('/api/availability/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, reply }),
      });
      const j = (await r.json().catch(() => ({ ok: false, error: 'network' }))) as Result;
      setResult(j);
    } catch {
      setResult({ ok: false, error: 'network' });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setHydrated(true);
    if (initialReply && !fired.current) {
      fired.current = true;
      void submit(initialReply);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (result) {
    if (result.ok && result.kind === 'count') {
      return (
        <div className="text-center" data-testid="ping-result" data-kind="count" data-count={result.count}>
          <div className="text-4xl mb-3">✅</div>
          <h2 className="text-lg font-semibold text-neutral-900">
            {result.count} open at {result.facilityName}
          </h2>
          <p className="mt-2 text-sm text-neutral-600">Saved. Your listing now shows <strong>Verified Availability</strong> as of today. We will ping again next week.</p>
        </div>
      );
    }
    if (result.ok && result.kind === 'stop') {
      return (
        <div className="text-center" data-testid="ping-result" data-kind="stop">
          <h2 className="text-lg font-semibold text-neutral-900">You are opted out</h2>
          <p className="mt-2 text-sm text-neutral-600">We will not send availability pings for {result.facilityName} again.</p>
        </div>
      );
    }
    if (result.ok) {
      return (
        <div className="text-center" data-testid="ping-result" data-kind="admin_review">
          <h2 className="text-lg font-semibold text-neutral-900">Got it — a person will follow up</h2>
          <p className="mt-2 text-sm text-neutral-600">We could not read that as a number, so our team will confirm {result.facilityName}&apos;s openings by hand.</p>
        </div>
      );
    }
    return (
      <div className="text-center" data-testid="ping-result" data-kind="error" data-error={result.error}>
        <h2 className="text-lg font-semibold text-neutral-900">
          {result.error === 'already_answered' ? `Already recorded${result.parsedCount != null ? `: ${result.parsedCount} open` : ''}` : result.error === 'expired' ? 'This ping has closed' : 'Could not save'}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">
          {result.error === 'already_answered' ? 'Each ping can be answered once. We will ping again next week.' : 'Please reply to the email instead.'}
        </p>
      </div>
    );
  }

  if (initialReply && busy) {
    return (
      <p className="text-center text-neutral-600" data-testid="ping-saving">Saving your reply for {facilityName}…</p>
    );
  }

  return (
    <div data-testid="ping-form" data-hydrated={hydrated ? 'true' : 'false'}>
      <h2 className="text-lg font-semibold text-neutral-900 text-center">Open beds this week at {facilityName}?</h2>
      <p className="mt-2 text-sm text-neutral-600 text-center">Tap a number (0 is fine).</p>
      <div className="mt-5 grid grid-cols-6 gap-2">
        {[0, 1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            disabled={busy || !hydrated}
            onClick={() => void submit(String(n))}
            className="rounded-lg bg-primary-600 py-3 text-white font-semibold hover:bg-primary-700 disabled:opacity-50"
            data-testid={`ping-count-${n}`}
          >
            {n}
          </button>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (other.trim()) void submit(other.trim());
        }}
      >
        <input
          type="number"
          min={0}
          max={999}
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Another number"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          data-testid="ping-other"
        />
        <button type="submit" disabled={busy || !hydrated || !other.trim()} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50" data-testid="ping-other-submit">
          Save
        </button>
      </form>
      <button type="button" disabled={busy || !hydrated} onClick={() => void submit('STOP')} className="mt-6 w-full text-xs text-neutral-400 hover:text-neutral-600" data-testid="ping-stop">
        Stop these pings (opt out)
      </button>
    </div>
  );
}
