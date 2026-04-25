'use client';

import { useState } from 'react';
import { FiX } from 'react-icons/fi';

interface Props {
  shiftId: string;
  caregiverName: string;
  onClose: () => void;
  onSaved: () => void;
}

const CALL_OFF_TYPES = [
  { value: 'NO_SHOW',         label: 'No-show (never arrived)',    penalty: '-30 pts, -25 score' },
  { value: 'CALLED_OFF',      label: 'Called off',                 penalty: '-15 pts, -12 score' },
  { value: 'EARLY_DEPARTURE', label: 'Left early',                 penalty: '-12 pts, -10 score' },
  { value: 'LATE_ARRIVAL',    label: 'Late arrival',               penalty: '-5 pts, -5 score' },
];

export default function RecordCallOffModal({ shiftId, caregiverName, onClose, onSaved }: Props) {
  const [type, setType] = useState('NO_SHOW');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/operator/shifts/${shiftId}/calloff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, notes }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to record call-off');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const selected = CALL_OFF_TYPES.find((t) => t.value === type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-neutral-900">Record Call-Off</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <FiX size={20} />
          </button>
        </div>

        <p className="text-sm text-neutral-600 mb-4">
          Recording a call-off for <span className="font-medium">{caregiverName}</span>. This will update their reliability score and points.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
            <div className="space-y-2">
              {CALL_OFF_TYPES.map((opt) => (
                <label key={opt.value} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${type === opt.value ? 'border-red-400 bg-red-50' : 'border-neutral-200 hover:border-neutral-300'}`}>
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="type"
                      value={opt.value}
                      checked={type === opt.value}
                      onChange={() => setType(opt.value)}
                      className="text-red-500"
                    />
                    <span className="text-sm text-neutral-700">{opt.label}</span>
                  </div>
                  <span className="text-xs text-red-600 font-medium">{opt.penalty}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any additional context..."
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn bg-red-600 text-white hover:bg-red-700 border-red-600"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Record Call-Off'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
