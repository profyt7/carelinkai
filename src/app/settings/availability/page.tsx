"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = {
  id: string;
  startTime: string; // ISO
  endTime: string; // ISO
  isAvailable: boolean;
  availableFor: string[];
  homeId?: string | null;
};

const dow = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"] as const;

function isoToLocalHM(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
}

function applyHM(date: Date, hm: string) {
  const [hStr, mStr] = hm.split(":");
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function nextOccurrence(targetDow: number, from=new Date()) {
  const d = new Date(from);
  d.setHours(0,0,0,0);
  const delta = (targetDow + 7 - d.getDay()) % 7;
  d.setDate(d.getDate() + (delta === 0 ? 0 : delta));
  return d;
}

export default function AvailabilitySettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [selDow, setSelDow] = useState<number>(1); // Monday default
  const [startHM, setStartHM] = useState("09:00");
  const [endHM, setEndHM] = useState("17:00");
  const [repeatWeeks, setRepeatWeeks] = useState(0);

  const grouped = useMemo(() => {
    const g: Slot[][] = [[],[],[],[],[],[],[]];
    for (const s of slots) {
      const d = new Date(s.startTime);
      g[d.getDay()]!.push(s);
    }
    for (let i = 0; i < g.length; i++) {
      g[i]!.sort((a,b)=>new Date(a.startTime).getTime()-new Date(b.startTime).getTime());
    }
    return g;
  }, [slots]);

  async function fetchSlots() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/caregiver/availability');
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setSlots(json.data || []);
    } catch (e:any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ fetchSlots(); }, []);

  async function addSlots(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    // Build one or many ISO ranges based on day-of-week + HM and repeatWeeks
    const first = nextOccurrence(selDow);
    const startFirst = applyHM(first, startHM);
    const endFirst = applyHM(first, endHM);
    if (!(startFirst < endFirst)) { setError('Start must be before end'); return; }
    const slotsPayload: { startTime: string; endTime: string }[] = [];
    for (let i=0;i<=repeatWeeks;i++) {
      const s = new Date(startFirst); s.setDate(s.getDate()+i*7);
      const e = new Date(endFirst); e.setDate(e.getDate()+i*7);
      slotsPayload.push({ startTime: s.toISOString(), endTime: e.toISOString() });
    }
    const res = await fetch('/api/caregiver/availability', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slots: slotsPayload })
    });
    const json = await res.json();
    if (!res.ok) { setError(json?.error || 'Failed to add'); return; }
    await fetchSlots();
  }

  async function updateSlot(slot: Slot, newStartHM: string, newEndHM: string) {
    const day = new Date(slot.startTime);
    const newStart = applyHM(day, newStartHM);
    const newEnd = applyHM(day, newEndHM);
    if (!(newStart < newEnd)) { setError('Start must be before end'); return; }
    const res = await fetch(`/api/caregiver/availability/${slot.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime: newStart.toISOString(), endTime: newEnd.toISOString() })
    });
    const json = await res.json();
    if (!res.ok) { setError(json?.error || 'Failed to update'); return; }
    await fetchSlots();
  }

  async function deleteSlot(slot: Slot) {
    const res = await fetch(`/api/caregiver/availability/${slot.id}`, { method: 'DELETE' });
    if (!res.ok) {
      try { const j = await res.json(); setError(j?.error || 'Failed to delete'); } catch { setError('Failed to delete'); }
      return;
    }
    await fetchSlots();
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Availability</h1>
      <p className="text-sm text-gray-600 mb-6">Set the days and times you're available to work. You can optionally repeat weekly for multiple weeks.</p>

      <form onSubmit={addSlots} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end bg-white p-4 rounded border mb-6">
        <label className="flex flex-col text-sm">
          <span className="mb-1">Day</span>
          <select className="border rounded px-2 py-2" value={selDow} onChange={e=>setSelDow(parseInt(e.target.value,10))}>
            {dow.map((d,i)=> (<option key={i} value={i}>{d}</option>))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">Start</span>
          <input className="border rounded px-2 py-2" type="time" value={startHM} onChange={e=>setStartHM(e.target.value)} required />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1">End</span>
          <input className="border rounded px-2 py-2" type="time" value={endHM} onChange={e=>setEndHM(e.target.value)} required />
        </label>
        <div className="flex gap-3 items-end">
          <label className="flex flex-col text-sm">
            <span className="mb-1">Repeat (weeks)</span>
            <input className="border rounded px-2 py-2 w-24" type="number" min={0} max={12} value={repeatWeeks} onChange={e=>setRepeatWeeks(Math.max(0, Math.min(12, parseInt(e.target.value||'0',10))))} />
          </label>
          <button type="submit" className="ml-auto inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
        </div>
      </form>

      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}

      {loading ? (
        <div>Loadingâ€¦</div>
      ) : (
        <div className="space-y-6">
          {dow.map((name, i) => (
            <div key={i}>
              <h2 className="text-lg font-medium mb-2">{name}</h2>
              <div className="space-y-2">
                {(grouped[i] ?? []).length === 0 ? (
                  <div className="text-sm text-gray-500">No slots</div>
                 ) : (grouped[i] ?? []).map((s) => (
                  <SlotRow key={s.id} slot={s} onSave={updateSlot} onDelete={deleteSlot} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SlotRow({ slot, onSave, onDelete }: { slot: Slot; onSave: (slot: Slot, startHM: string, endHM: string)=>Promise<void>; onDelete: (slot: Slot)=>Promise<void>; }) {
  const [edit, setEdit] = useState(false);
  const [s, setS] = useState(isoToLocalHM(slot.startTime));
  const [e, setE] = useState(isoToLocalHM(slot.endTime));
  const localDate = new Date(slot.startTime).toLocaleDateString();

  return (
    <div className="flex items-center gap-3 border rounded px-3 py-2 bg-white">
      <div className="text-sm text-gray-600 w-28">{localDate}</div>
      {edit ? (
        <div className="flex items-center gap-2">
          <input type="time" className="border rounded px-2 py-1" value={s} onChange={e=>setS(e.target.value)} />
          <span className="text-gray-400">â€“</span>
          <input type="time" className="border rounded px-2 py-1" value={e} onChange={e=>setE(e.target.value)} />
        </div>
      ) : (
        <div className="text-sm">{s} â€“ {e}</div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {edit ? (
          <>
            <button className="px-2 py-1 text-sm rounded bg-green-600 text-white" onClick={async ()=>{ await onSave(slot, s, e); setEdit(false); }}>Save</button>
            <button className="px-2 py-1 text-sm rounded border" onClick={()=>{ setEdit(false); setS(isoToLocalHM(slot.startTime)); setE(isoToLocalHM(slot.endTime)); }}>Cancel</button>
          </>
        ) : (
          <button className="px-2 py-1 text-sm rounded border" onClick={()=>setEdit(true)}>Edit</button>
        )}
        <button className="px-2 py-1 text-sm rounded border border-red-300 text-red-600" onClick={()=>onDelete(slot)}>Delete</button>
      </div>
    </div>
  );
}

