'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  homes: { id: string; name: string }[];
  openShifts: { id: string; homeId: string; label: string }[];
  onCreated: () => void;
  onClose: () => void;
}

export default function CreateNeedModal({ homes, openShifts, onCreated, onClose }: Props) {
  const [homeId, setHomeId] = useState(homes[0]?.id ?? '');
  const [shiftId, setShiftId] = useState('');
  const [skills, setSkills] = useState('');
  const [certs, setCerts] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const homeShifts = openShifts.filter((s) => s.homeId === homeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/scheduling/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeId,
          shiftId: shiftId || undefined,
          requiredSkills: skills.split(',').map((s) => s.trim()).filter(Boolean),
          requiredCerts: certs.split(',').map((s) => s.trim()).filter(Boolean),
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed');
      toast.success('Coverage need created');
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? 'Error creating need');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="font-semibold text-neutral-900">New Coverage Need</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Home *</label>
            <select
              value={homeId}
              onChange={(e) => { setHomeId(e.target.value); setShiftId(''); }}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {homes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>

          {homeShifts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Link to Open Shift (optional)</label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— No specific shift —</option>
                {homeShifts.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Required Skills / Care Types</label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="e.g. memory care, CPR, dementia"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-neutral-400 mt-1">Comma-separated</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Required Certifications</label>
            <input
              type="text"
              value={certs}
              onChange={(e) => setCerts(e.target.value)}
              placeholder="e.g. CNA, BLS"
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-neutral-400 mt-1">Comma-separated</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes for Caregiver</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any special instructions..."
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 btn">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 btn btn-primary">
              {saving ? 'Creating...' : 'Create Need'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
