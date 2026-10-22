'use client';

/**
 * Operator-portal "Availability contact" card (sprint W5-5). The operator names
 * who answers the weekly one-line "how many beds are open?" email and opts in.
 * Reads / writes /api/operator/availability-contact (W4-1). Saving records the
 * opt-in (source OPERATOR + timestamp) in History via recordEvent. Nothing is
 * sent from here — the weekly ping only runs when PING_ENABLED is set.
 */

import { useEffect, useRef, useState } from 'react';

export const OPT_IN_LABEL = 'Send me a weekly one-line email asking how many beds are open. Reply with a number or STOP.';

type Contact = {
  name: string;
  email: string | null;
  mobile: string | null;
  preferredChannel: 'EMAIL' | 'SMS';
  optedIn: boolean;
  optedInAt: string | null;
  optedInSource: string | null;
  optedOutAt: string | null;
} | null;

export default function AvailabilityContactCard({ homeId }: { homeId: string }) {
  const [loaded, setLoaded] = useState(false);
  const [contact, setContact] = useState<Contact>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [optedIn, setOptedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  // The mount effect runs twice in React dev (StrictMode) and the API route
  // compiles lazily under `next dev`, so two loads can be in flight while the
  // operator is already typing; a late one must not wipe their edits (it reset
  // the opt-in checkbox mid-test in CI — OL-153). Only the newest load writes,
  // and the form fields are only (re)filled when the operator has not touched
  // them since the last load.
  const seq = useRef(0);
  const dirty = useRef(false);

  async function load() {
    const mine = ++seq.current;
    try {
      const r = await fetch(`/api/operator/availability-contact?homeId=${encodeURIComponent(homeId)}`, { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (mine !== seq.current) return;
        const c: Contact = j.contact ?? null;
        setContact(c);
        if (!dirty.current) {
          setName(c?.name ?? '');
          setEmail(c?.email ?? '');
          setMobile(c?.mobile ?? '');
          setOptedIn(c?.optedIn ?? false);
        }
      }
    } finally {
      if (mine === seq.current) setLoaded(true);
    }
  }
  useEffect(() => {
    dirty.current = false;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeId]);
  const edit = <T,>(set: (v: T) => void) => (v: T) => {
    dirty.current = true;
    set(v);
  };

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    setErr('');
    try {
      const r = await fetch('/api/operator/availability-contact', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeId, name, email: email || null, mobile: mobile || null, preferredChannel: 'EMAIL', optedIn }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j.error || 'Could not save.');
      } else {
        setMsg(optedIn ? 'Saved. You are opted in to the weekly availability email.' : 'Saved. You are not receiving the weekly email.');
        dirty.current = false; // the server copy is now the truth; let the reload fill the form
        await load();
      }
    } catch {
      setErr('Network error.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3 text-sm" data-testid="availability-contact-card" data-loaded={loaded ? 'true' : 'false'}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-neutral-800">Availability contact</div>
        {contact?.optedIn ? (
          <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700 ring-1 ring-inset ring-success-200" data-testid="availability-contact-status">Opted in</span>
        ) : (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600" data-testid="availability-contact-status">Not opted in</span>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        Who should we ask when a family wants to know if you have an open bed? One short email a week; reply with a number.
        Your listing then shows “Verified Availability” with the date. Business contact only — never shown publicly.
      </p>
      <form onSubmit={save} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="form-label" htmlFor={`ac-name-${homeId}`}>Contact name</label>
            <input id={`ac-name-${homeId}`} name="name" className="form-input" value={name} onChange={(e) => edit(setName)(e.target.value)} required minLength={2} maxLength={120} autoComplete="name" />
          </div>
          <div>
            <label className="form-label" htmlFor={`ac-email-${homeId}`}>Email</label>
            <input id={`ac-email-${homeId}`} name="email" type="email" className="form-input" value={email} onChange={(e) => edit(setEmail)(e.target.value)} maxLength={254} autoComplete="email" />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label" htmlFor={`ac-mobile-${homeId}`}>Mobile (optional, for a future text option)</label>
            <input id={`ac-mobile-${homeId}`} name="mobile" type="tel" className="form-input" value={mobile} onChange={(e) => edit(setMobile)(e.target.value)} maxLength={40} autoComplete="tel" />
          </div>
        </div>
        <label className="flex items-start gap-2 text-neutral-800">
          <input type="checkbox" className="form-checkbox mt-0.5 h-4 w-4" checked={optedIn} onChange={(e) => edit(setOptedIn)(e.target.checked)} data-testid="availability-contact-optin" />
          <span>{OPT_IN_LABEL}</span>
        </label>
        {contact?.optedIn && contact.optedInAt && (
          <p className="text-xs text-neutral-500" data-testid="availability-contact-optin-meta">
            Opted in {new Date(contact.optedInAt).toLocaleDateString()} via {contact.optedInSource === 'operator_portal' ? 'this portal' : contact.optedInSource ?? 'unknown'}.
          </p>
        )}
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary" type="submit" disabled={busy} data-testid="availability-contact-save">{busy ? 'Saving…' : 'Save contact'}</button>
          {msg && <span className="text-xs text-success-700" data-testid="availability-contact-msg">{msg}</span>}
          {err && <span className="text-xs text-error-700" role="alert">{err}</span>}
        </div>
      </form>
    </div>
  );
}
