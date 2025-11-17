"use client";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export function StatusActions({ residentId, status }: { residentId: string; status: string }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function doAdmit() {
    setError(null);
    const res = await fetch(`/api/residents/${residentId}/admit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admissionDate: date }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to admit');
      return;
    }
    toast.success('Admitted');
    startTransition(() => router.refresh());
  }

  async function doDischarge(type: 'DISCHARGED' | 'DECEASED') {
    setError(null);
    const res = await fetch(`/api/residents/${residentId}/discharge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dischargeDate: date, status: type }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || 'Failed to discharge');
      return;
    }
    toast.success(type === 'DECEASED' ? 'Marked deceased' : 'Discharged');
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-4 p-3 border rounded bg-neutral-50">
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="date">Date</label>
        <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1" />
        {status !== 'ACTIVE' && (
          <button disabled={loading} className="btn btn-sm" onClick={doAdmit}>Admit</button>
        )}
        {status === 'ACTIVE' && (
          <>
            <button disabled={loading} className="btn btn-sm" onClick={() => doDischarge('DISCHARGED')}>Discharge</button>
            <button disabled={loading} className="btn btn-sm btn-danger" onClick={() => doDischarge('DECEASED')}>Mark Deceased</button>
          </>
        )}
        {error && <span className="text-red-600 ml-2">{error}</span>}
      </div>
    </div>
  );
}
