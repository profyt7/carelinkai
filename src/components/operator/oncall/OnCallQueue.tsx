'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import CreateNeedModal from './CreateNeedModal';

interface Attempt {
  id: string;
  outcome: string;
  wave: number;
  channel: string;
  caregiver?: { user: { firstName: string; lastName: string } };
}

interface Need {
  id: string;
  status: string;
  currentWave: number;
  requiredSkills: string[];
  requiredCerts: string[];
  notes: string | null;
  createdAt: string;
  home: { id: string; name: string };
  shift: { startTime: string; endTime: string; hourlyRate: string } | null;
  filledByCaregiver: { user: { firstName: string; lastName: string } } | null;
  attempts: Attempt[];
}

interface Props {
  homes: { id: string; name: string }[];
  openShifts: { id: string; homeId: string; label: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-neutral-100 text-neutral-700',
  FILLING: 'bg-yellow-100 text-yellow-800',
  FILLED: 'bg-green-100 text-green-800',
  UNFILLED: 'bg-red-100 text-red-700',
  CANCELED: 'bg-neutral-100 text-neutral-500',
};

const OUTCOME_COLORS: Record<string, string> = {
  SENT: 'text-neutral-500',
  CONFIRMED: 'text-green-600 font-medium',
  DECLINED: 'text-red-500',
  ERROR: 'text-red-400',
  NO_RESPONSE: 'text-neutral-400',
};

export default function OnCallQueue({ homes, openShifts }: Props) {
  const [needs, setNeeds] = useState<Need[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<string | null>(null);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/scheduling/needs');
      const data = await res.json();
      setNeeds(data.needs ?? []);
    } catch {
      toast.error('Failed to load coverage queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStart = async (id: string) => {
    setDispatching(id);
    try {
      const res = await fetch(`/api/scheduling/needs/${id}/start`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      toast.success(data.reason ?? 'Wave dispatched');
      await load();
    } catch (e: any) {
      toast.error(e.message ?? 'Error');
    } finally {
      setDispatching(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this coverage need?')) return;
    setCanceling(id);
    try {
      await fetch(`/api/scheduling/needs/${id}/cancel`, { method: 'POST' });
      toast.success('Canceled');
      await load();
    } finally {
      setCanceling(null);
    }
  };

  const activeNeeds = needs.filter((n) => ['OPEN', 'FILLING'].includes(n.status));
  const displayed = filter === 'active' ? activeNeeds : needs;

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-neutral-900">On-Call AI Queue</h2>
          {activeNeeds.length > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {activeNeeds.length} active
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'active' | 'all')}
            className="border border-neutral-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="active">Active only</option>
            <option value="all">All needs</option>
          </select>
          <button
            onClick={() => setShowCreate(true)}
            className="btn btn-primary"
          >
            + New Coverage Need
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-500 py-8 text-center">Loading...</div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-neutral-200 p-12 text-center">
          <div className="text-4xl mb-3">📞</div>
          <p className="font-medium text-neutral-700">No coverage needs yet</p>
          <p className="text-sm text-neutral-500 mt-1">Create a need and CareLinkAI will automatically text and call caregivers to fill it.</p>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary mt-4">
            Create First Need
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((need) => (
            <div key={need.id} className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-neutral-900">{need.home.name}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[need.status]}`}>
                      {need.status}
                    </span>
                    {need.currentWave > 0 && (
                      <span className="text-xs text-neutral-400">Wave {need.currentWave}</span>
                    )}
                  </div>
                  {need.shift && (
                    <p className="text-sm text-neutral-600">
                      {formatTime(need.shift.startTime)} → {formatTime(need.shift.endTime)}
                      {' · '}${Number(need.shift.hourlyRate).toFixed(2)}/hr
                    </p>
                  )}
                  {(need.requiredSkills.length > 0 || need.requiredCerts.length > 0) && (
                    <p className="text-xs text-neutral-400 mt-1">
                      {[...need.requiredCerts, ...need.requiredSkills].join(' · ')}
                    </p>
                  )}
                  {need.filledByCaregiver && (
                    <p className="text-sm text-green-700 font-medium mt-1">
                      ✓ Filled by {need.filledByCaregiver.user.firstName} {need.filledByCaregiver.user.lastName}
                    </p>
                  )}
                  <p className="text-xs text-neutral-400 mt-1">
                    {need.attempts.length} contact{need.attempts.length !== 1 ? 's' : ''} sent
                    {' · '}Created {formatTime(need.createdAt)}
                  </p>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  {(need.status === 'OPEN' || need.status === 'FILLING') && (
                    <button
                      onClick={() => handleStart(need.id)}
                      disabled={dispatching === need.id}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {dispatching === need.id ? 'Dispatching...' : need.status === 'FILLING' ? 'Send Next Wave' : 'Start Auto-Fill'}
                    </button>
                  )}
                  {need.attempts.length > 0 && (
                    <button
                      onClick={() => setExpanded(expanded === need.id ? null : need.id)}
                      className="px-3 py-1.5 border border-neutral-200 text-neutral-600 rounded-md text-xs hover:bg-neutral-50"
                    >
                      {expanded === need.id ? 'Hide' : 'View'} Attempts
                    </button>
                  )}
                  {['OPEN', 'FILLING'].includes(need.status) && (
                    <button
                      onClick={() => handleCancel(need.id)}
                      disabled={canceling === need.id}
                      className="px-3 py-1.5 text-red-500 text-xs hover:underline"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {expanded === need.id && need.attempts.length > 0 && (
                <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3">
                  <p className="text-xs font-medium text-neutral-500 mb-2">Outreach History</p>
                  <div className="space-y-1">
                    {need.attempts.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 text-xs">
                        <span className="text-neutral-400">Wave {a.wave}</span>
                        <span className="text-neutral-500">{a.channel}</span>
                        <span className="text-neutral-600">
                          {a.caregiver ? `${a.caregiver.user.firstName} ${a.caregiver.user.lastName}` : 'Unknown'}
                        </span>
                        <span className={OUTCOME_COLORS[a.outcome] ?? 'text-neutral-500'}>{a.outcome}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateNeedModal
          homes={homes}
          openShifts={openShifts}
          onCreated={() => { setShowCreate(false); load(); }}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
