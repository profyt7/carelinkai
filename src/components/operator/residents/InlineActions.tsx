"use client";
import { useTransition, useState } from 'react';

export function InlineActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  async function call(path: string, body: any) {
    setErr(null);
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || 'Action failed');
      return false;
    }
    return true;
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="flex items-center gap-2">
      {status !== 'ACTIVE' ? (
        <button
          className="btn btn-xs"
          disabled={pending}
          onClick={() => start(async () => { await call(`/api/residents/${id}/admit`, { admissionDate: today }); location.reload(); })}
        >Admit</button>
      ) : (
        <>
          <button
            className="btn btn-xs"
            disabled={pending}
            onClick={() => start(async () => { await call(`/api/residents/${id}/discharge`, { dischargeDate: today, status: 'DISCHARGED' }); location.reload(); })}
          >Discharge</button>
          <button
            className="btn btn-xs btn-danger"
            disabled={pending}
            onClick={() => start(async () => { await call(`/api/residents/${id}/discharge`, { dischargeDate: today, status: 'DECEASED' }); location.reload(); })}
          >Deceased</button>
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
