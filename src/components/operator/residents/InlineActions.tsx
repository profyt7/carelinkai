"use client";
import { useTransition, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';

type HomeOption = { id: string; name: string };

export function InlineActions({ id, status, homes = [] as HomeOption[] }: { id: string; status: string; homes?: HomeOption[] }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  async function call(path: string, body: any) {
    setErr(null);
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || 'Action failed');
      return false;
    }
    toast.success('Success');
    return true;
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-center gap-2">
      {status !== 'ACTIVE' ? (
        <button
          className="btn btn-xs"
          disabled={pending}
          onClick={() => start(async () => { const ok = await call(`/api/residents/${id}/admit`, { admissionDate: today }); if (ok) location.reload(); })}
        >Admit</button>
      ) : (
        <>
          <button
            className="btn btn-xs"
            disabled={pending}
            onClick={() => start(async () => { const ok = await call(`/api/residents/${id}/discharge`, { dischargeDate: today, status: 'DISCHARGED' }); if (ok) location.reload(); })}
          >Discharge</button>
          <button
            className="btn btn-xs btn-danger"
            disabled={pending}
            onClick={() => start(async () => { const ok = await call(`/api/residents/${id}/discharge`, { dischargeDate: today, status: 'DECEASED' }); if (ok) location.reload(); })}
          >Deceased</button>
          <div className="relative inline-flex items-center">
            <button
              type="button"
              className="btn btn-xs"
              onClick={() => setShowTransfer((v) => !v)}
            >Transfer</button>
            {showTransfer && (
              <div className="absolute z-10 top-full right-0 mt-1 p-2 bg-white border rounded shadow min-w-[220px]">
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded px-2 py-1 text-xs max-w-[160px]"
                    ref={selectRef}
                    defaultValue=""
                  >
                    <option value="">Select home…</option>
                    {homes.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-xs"
                    onClick={() => start(async () => {
                      const selected = selectRef.current?.value || "";
                      if (!selected) { setErr('Select a home'); return; }
                      const ok = await call(`/api/residents/${id}/transfer`, { homeId: selected, effectiveDate: new Date().toISOString() });
                      if (ok) {
                        setShowTransfer(false);
                        location.reload();
                      }
                    })}
                  >Go</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const color = status === 'ACTIVE' ? 'bg-green-100 text-green-700'
    : status === 'DISCHARGED' ? 'bg-neutral-100 text-neutral-700'
    : status === 'DECEASED' ? 'bg-red-100 text-red-700'
    : status === 'PENDING' ? 'bg-amber-100 text-amber-800'
    : 'bg-blue-100 text-blue-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{status}</span>;
}
