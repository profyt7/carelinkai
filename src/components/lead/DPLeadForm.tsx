'use client';

/**
 * DP lead-capture form (feat/dp-lead-capture). Rendered only after the server has
 * validated the shared-secret token. Captures planner CONTACT + INTEREST — NO PHI,
 * no patient details. On submit → POST /api/lead/dp → simple "Logged ✓" state.
 */

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

const DEPARTMENTS = ['Case Management', 'Social Work', 'Discharge Planning'] as const;

export default function DPLeadForm({ token }: { token: string }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [hospital, setHospital] = useState('');
  const [department, setDepartment] = useState('');
  const [interestLevel, setInterestLevel] = useState<'HOT' | 'WARM'>('WARM');
  const [notes, setNotes] = useState('');
  const [company, setCompany] = useState(''); // honeypot — hidden from real users
  const [consent, setConsent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && email.trim() && hospital.trim() && consent && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/lead/dp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          k: token,
          name: name.trim(),
          email: email.trim(),
          hospital: hospital.trim(),
          department: department || null,
          interestLevel,
          notes: notes.trim() || null,
          consent,
          company, // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Something went wrong. Please try again.');
      setDone(true);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="text-center py-4">
        <CheckCircle2 className="h-12 w-12 text-success-600 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-neutral-900">Logged ✓</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Thanks — the follow-up is on its way from Chris. You can close this tab.
        </p>
        <button
          type="button"
          onClick={() => {
            setName(''); setEmail(''); setHospital(''); setDepartment('');
            setInterestLevel('WARM'); setNotes(''); setCompany(''); setConsent(false);
            setDone(false); setError(null);
          }}
          className="mt-6 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          Log another planner
        </button>
      </div>
    );
  }

  const inputCls =
    'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none';
  const labelCls = 'block text-sm font-medium text-neutral-700 mb-1';

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className={labelCls} htmlFor="dp-name">Planner name <span className="text-red-500">*</span></label>
        <input id="dp-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} autoComplete="off" />
      </div>

      <div>
        <label className={labelCls} htmlFor="dp-email">Best work email <span className="text-red-500">*</span></label>
        <input id="dp-email" type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} autoComplete="off" />
      </div>

      <div>
        <label className={labelCls} htmlFor="dp-hospital">Hospital / system <span className="text-red-500">*</span></label>
        <input id="dp-hospital" className={inputCls} value={hospital} onChange={(e) => setHospital(e.target.value)} required maxLength={200} autoComplete="off" />
      </div>

      <div>
        <label className={labelCls} htmlFor="dp-dept">Department</label>
        <select id="dp-dept" className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">Select (optional)</option>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div>
        <span className={labelCls}>Interest level</span>
        <div className="flex gap-2">
          {(['HOT', 'WARM'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setInterestLevel(lvl)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                interestLevel === lvl
                  ? lvl === 'HOT'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {lvl === 'HOT' ? '🔥 Hot' : '🌤 Warm'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelCls} htmlFor="dp-notes">Notes</label>
        <textarea
          id="dp-notes"
          className={`${inputCls} min-h-[72px] resize-y`}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          placeholder="Anything from the call worth remembering. No patient details."
        />
      </div>

      {/* Honeypot — visually hidden, off-screen; bots fill it, humans don't. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', top: 'auto', height: 0, overflow: 'hidden' }}>
        <label htmlFor="dp-company">Company</label>
        <input id="dp-company" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          required
        />
        <span className="text-xs leading-relaxed text-neutral-600">
          The planner verbally agreed to be contacted by CareLinkAI. <span className="text-red-500">*</span>
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
      >
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitting ? 'Logging…' : 'Log this planner'}
      </button>

      <p className="text-center text-xs text-neutral-400">
        Planner contact + interest only. No patient information is collected here.
      </p>
    </form>
  );
}
