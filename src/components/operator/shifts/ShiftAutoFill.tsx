'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface CaregiverMatch {
  caregiverId: string;
  userId: string;
  name: string;
  hourlyRate: number | null;
  yearsExperience: number | null;
  specialties: string[];
  reliabilityScore: number | null;
  backgroundCheckStatus: string;
  matchReason: string;
  rank: number;
}

interface AutoFillResult {
  matches: CaregiverMatch[];
  summary: string;
}

interface Props {
  homeId: string;
  homeName: string;
}

const BG_CHECK_BADGE: Record<string, string> = {
  CLEARED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  NOT_STARTED: 'bg-neutral-100 text-neutral-600',
  FAILED: 'bg-red-100 text-red-800',
};

export default function ShiftAutoFill({ homeId, homeName }: Props) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AutoFillResult | null>(null);

  const handleSearch = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/operator/shifts/autofill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeId, description, date: date || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResult(data);
    } catch (e: any) {
      toast.error(e.message || 'AI search failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.346.346a1 1 0 01-.707.293H8.698a1 1 0 01-.707-.293l-.347-.347z" />
        </svg>
        AI Shift Auto-fill
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <h3 className="font-semibold text-neutral-900">AI Shift Auto-fill — {homeName}</h3>
        </div>
        <button
          onClick={() => { setOpen(false); setResult(null); }}
          className="text-neutral-400 hover:text-neutral-600"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Describe your staffing need
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Need an overnight memory care aide this Friday 10pm–6am, must be CPR certified"
            rows={2}
            className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Date (optional)
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !description.trim()}
          className="w-full py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'Searching with AI...' : 'Find Caregivers'}
        </button>
      </div>

      {result && (
        <div>
          {result.summary && (
            <p className="text-sm text-indigo-700 bg-indigo-50 rounded-md px-3 py-2 mb-3">
              {result.summary}
            </p>
          )}
          {result.matches.length === 0 ? (
            <p className="text-sm text-neutral-500">No available caregivers found matching this need.</p>
          ) : (
            <div className="space-y-3">
              {result.matches.map((match) => (
                <div key={match.caregiverId} className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-neutral-900">{match.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${BG_CHECK_BADGE[match.backgroundCheckStatus] ?? BG_CHECK_BADGE['NOT_STARTED']}`}>
                          {match.backgroundCheckStatus.replace(/_/g, ' ')}
                        </span>
                        {match.reliabilityScore != null && (
                          <span className="text-xs text-neutral-500">⭐ {match.reliabilityScore.toFixed(0)}/100</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 mb-1">
                        {match.yearsExperience != null ? `${match.yearsExperience} yrs exp` : 'Experience N/A'}
                        {match.hourlyRate != null ? ` · $${match.hourlyRate}/hr` : ''}
                        {match.specialties.length > 0 ? ` · ${match.specialties.slice(0, 3).join(', ')}` : ''}
                      </p>
                      <p className="text-xs text-indigo-700 italic">{match.matchReason}</p>
                    </div>
                    <a
                      href={`/operator/caregivers/${match.caregiverId}`}
                      className="flex-shrink-0 px-3 py-1.5 border border-indigo-300 text-indigo-700 rounded text-xs font-medium hover:bg-indigo-50"
                    >
                      View Profile
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
