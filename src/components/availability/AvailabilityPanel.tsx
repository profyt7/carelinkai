'use client';

import { useEffect, useState } from 'react';
import AvailabilityBadge, { type AvailabilityViewProp } from './AvailabilityBadge';

/**
 * Admin availability panel (OL-110) — Anita's concierge-logging + contact/consent UI.
 * Calls GET/POST /api/admin/homes/[id]/availability. Business data only (no PHI).
 *  - shows the current verified view + freshness badge
 *  - set contactMobile + availabilityOptIn (consent to the SMS poll)
 *  - log a CONCIERGE / VOICE / OPERATOR confirmation (count + source)
 *  - copy the email magic-link to send to the facility
 */
type Loaded = {
  home: { id: string; name: string; contactMobile: string | null; availabilityOptIn: boolean };
  view: AvailabilityViewProp;
  magicLink: string | null;
};

export default function AvailabilityPanel({ homeId }: { homeId: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [mobile, setMobile] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [count, setCount] = useState<number>(0);
  const [source, setSource] = useState<'CONCIERGE' | 'VOICE' | 'OPERATOR'>('CONCIERGE');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    const res = await fetch(`/api/admin/homes/${homeId}/availability`);
    if (res.ok) {
      const d: Loaded = await res.json();
      setData(d);
      setMobile(d.home.contactMobile || '');
      setOptIn(d.home.availabilityOptIn);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);

  async function post(payload: Record<string, unknown>, okMsg: string) {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/homes/${homeId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setMsg(okMsg);
        await load();
      } else setMsg(d.error || 'Something went wrong.');
    } catch {
      setMsg('Network error.');
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">Loading availability…</div>;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Availability freshness</h3>
        <AvailabilityBadge availability={data.view} />
      </div>
      <p className="text-xs text-neutral-500 -mt-3">{data.view.label}</p>

      {/* Log a concierge / voice / operator confirmation */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-neutral-600">Log a confirmation</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(Math.max(0, parseInt(e.target.value || '0', 10)))}
            className="w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            aria-label="Openings"
          />
          <span className="text-sm text-neutral-500">openings, via</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as 'CONCIERGE' | 'VOICE' | 'OPERATOR')}
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="CONCIERGE">Concierge (confirmed today)</option>
            <option value="VOICE">AI voice call</option>
            <option value="OPERATOR">Operator told us</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => post({ source, count }, 'Availability logged — verified today.')}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            Log availability
          </button>
        </div>
      </div>

      {/* Contact + consent for the SMS poll */}
      <div className="space-y-2 border-t border-neutral-100 pt-4">
        <label className="block text-xs font-medium text-neutral-600">Best mobile + SMS consent</label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder="(216) 245-9482"
            className="w-40 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            aria-label="Contact mobile"
          />
          <label className="flex items-center gap-1.5 text-sm text-neutral-700">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            Consented to availability texts
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => post({ contactMobile: mobile, availabilityOptIn: optIn }, 'Contact + consent saved.')}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            Save contact
          </button>
        </div>
        <p className="text-[11px] text-neutral-400">Only consented numbers are ever texted. Reply STOP opts out instantly.</p>
      </div>

      {/* Email magic-link to send */}
      {data.magicLink && (
        <div className="space-y-1 border-t border-neutral-100 pt-4">
          <label className="block text-xs font-medium text-neutral-600">Email update link (send to the facility)</label>
          <div className="flex items-center gap-2">
            <input readOnly value={data.magicLink} className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs text-neutral-600" />
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(data.magicLink as string).then(() => setMsg('Link copied.'))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {msg && <p className="text-xs text-success-700">{msg}</p>}
    </div>
  );
}
