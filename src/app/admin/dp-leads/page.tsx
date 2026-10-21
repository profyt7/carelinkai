'use client';

/**
 * /admin/dp-leads — Chris's DP lead follow-up console (feat/dp-lead-capture).
 * Lists leads Anita logs, their sequence status, and last/next touch. Buttons:
 * Mark replied · Mark patient sent · Stop (all halt the sequence). ~5-min async
 * touchpoint — this is Chris's only recurring surface for this lane.
 */

import { useCallback, useEffect, useState } from 'react';
import { Loader2, CheckCircle, MessageSquare, Send, Ban, Stethoscope, Trash2 } from 'lucide-react';

type Lead = {
  id: string;
  name: string;
  email: string;
  hospital: string;
  department: string | null;
  interestLevel: string;
  consent: boolean;
  notes: string | null;
  status: string;
  stoppedReason: string | null;
  touchStep: number;
  createdAt: string;
  lastTouchAt: string | null;
  nextTouchAt: string | null;
};

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'replied', label: 'Replied' },
  { key: 'patient_sent', label: 'Patient sent' },
  { key: 'booked', label: 'Booked' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'ALL', label: 'All' },
] as const;

function fmt(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function StatusPill({ lead }: { lead: Lead }) {
  const map: Record<string, string> = {
    active: 'bg-primary-100 text-primary-800',
    replied: 'bg-success-100 text-success-800',
    patient_sent: 'bg-indigo-100 text-indigo-800',
    booked: 'bg-emerald-100 text-emerald-800',
    stopped: 'bg-neutral-200 text-neutral-700',
  };
  const label = lead.status === 'patient_sent' ? 'Patient sent' : lead.status.charAt(0).toUpperCase() + lead.status.slice(1);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[lead.status] || 'bg-neutral-100 text-neutral-700'}`}>
      {label}
      {lead.status === 'stopped' && lead.stoppedReason ? ` · ${lead.stoppedReason}` : ''}
    </span>
  );
}

export default function AdminDpLeadsPage() {
  const [rows, setRows] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filter === 'ALL' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/admin/dp-leads${qs}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load');
      setRows(Array.isArray(data.leads) ? data.leads : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load DP leads');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/dp-leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Action failed');
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  async function del(lead: Lead) {
    if (!window.confirm(`Permanently delete this lead?\n\n${lead.name} — ${lead.hospital}\n${lead.email}\n\nThis cannot be undone.`)) return;
    setBusyId(lead.id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/dp-leads/${lead.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || 'Delete failed');
      }
      await load();
    } catch (e: any) {
      setError(e?.message || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-primary-600" /> DP leads
        </h1>
        <p className="text-neutral-600 text-sm mt-1">
          Discharge planners Anita logged. The follow-up sequence runs automatically; mark a lead replied /
          patient-sent / stop to halt it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f.key ? 'bg-primary-600 text-white' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-neutral-500 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 text-neutral-500">
          <Stethoscope className="h-10 w-10 mx-auto mb-3 text-neutral-300" />
          <p className="text-sm">No leads here yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 text-neutral-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Planner</th>
                <th className="px-4 py-3 font-medium">Hospital</th>
                <th className="px-4 py-3 font-medium">Interest</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Touches</th>
                <th className="px-4 py-3 font-medium">Last / Next</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((lead) => (
                <tr key={lead.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-neutral-900">{lead.name}</div>
                    <a href={`mailto:${lead.email}`} className="text-primary-600 hover:underline text-xs">{lead.email}</a>
                    {lead.notes && <div className="text-xs text-neutral-500 mt-1 max-w-xs">{lead.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {lead.hospital}
                    {lead.department && <div className="text-xs text-neutral-400">{lead.department}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${lead.interestLevel === 'HOT' ? 'text-red-600' : 'text-amber-600'}`}>
                      {lead.interestLevel === 'HOT' ? '🔥 Hot' : '🌤 Warm'}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusPill lead={lead} /></td>
                  <td className="px-4 py-3 text-neutral-600">{lead.touchStep}/4</td>
                  <td className="px-4 py-3 text-neutral-600 whitespace-nowrap">
                    <div>Last {fmt(lead.lastTouchAt)}</div>
                    <div className="text-xs text-neutral-400">Next {fmt(lead.nextTouchAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {lead.status === 'active' ? (
                        <>
                          <button onClick={() => act(lead.id, 'replied')} disabled={busyId === lead.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-success-50 text-success-700 hover:bg-success-100 disabled:opacity-50">
                            <MessageSquare className="h-3 w-3" /> Replied
                          </button>
                          <button onClick={() => act(lead.id, 'patient_sent')} disabled={busyId === lead.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                            <Send className="h-3 w-3" /> Patient sent
                          </button>
                          <button onClick={() => act(lead.id, 'stop')} disabled={busyId === lead.id}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 disabled:opacity-50">
                            <Ban className="h-3 w-3" /> Stop
                          </button>
                        </>
                      ) : (
                        <button onClick={() => act(lead.id, 'reactivate')} disabled={busyId === lead.id}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50">
                          <CheckCircle className="h-3 w-3" /> Reactivate
                        </button>
                      )}
                      <button onClick={() => del(lead)} disabled={busyId === lead.id} title="Delete this lead permanently"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50">
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                      {busyId === lead.id && <Loader2 className="h-3 w-3 animate-spin text-neutral-400" />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
