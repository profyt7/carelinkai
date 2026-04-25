'use client';

import { useState } from 'react';
import { FiZap, FiSearch, FiX, FiUser } from 'react-icons/fi';
import Link from 'next/link';

interface SearchResult {
  id: string;
  name: string;
  yearsExperience: number | null;
  hourlyRate: number | null;
  specialties: string[];
  backgroundCheckStatus: string;
  reliabilityScore: number | null;
  matchReason: string;
}

export default function SmartSearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSearched(false);
    try {
      const res = await fetch('/api/operator/caregivers/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setResults(data.results ?? []);
      setSummary(data.summary ?? '');
      setSearched(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setQuery('');
    setResults([]);
    setSummary('');
    setSearched(false);
    setError('');
  };

  const bgBadge = (status: string) =>
    status === 'CLEAR' ? 'bg-green-100 text-green-700' :
    status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
    'bg-neutral-100 text-neutral-500';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 transition-colors"
      >
        <FiZap size={15} />
        Smart Search
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FiZap size={15} className="text-indigo-600" />
          <span className="text-sm font-semibold text-neutral-800">AI Caregiver Search</span>
        </div>
        <button onClick={() => { setOpen(false); reset(); }} className="text-neutral-400 hover:text-neutral-600">
          <FiX size={16} />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder='Try: "female dementia aide, overnight, at least 3 years experience"'
          className="flex-1 text-sm border border-neutral-200 bg-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={search}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center gap-1.5"
        >
          {loading ? (
            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <FiSearch size={14} />
          )}
          Search
        </button>
        {searched && (
          <button onClick={reset} className="px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-600 hover:bg-neutral-50">
            Clear
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {searched && (
        <div className="mt-4">
          {summary && <p className="text-xs text-neutral-500 mb-3">{summary}</p>}

          {results.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">No matching caregivers found.</p>
          ) : (
            <div className="space-y-2">
              {results.map((r, i) => (
                <Link
                  key={r.id}
                  href={`/operator/caregivers/${r.id}`}
                  className="flex items-start gap-3 bg-white rounded-lg border border-neutral-200 p-3 hover:border-indigo-300 hover:shadow-sm transition-all"
                >
                  <div className="rounded-full bg-indigo-100 p-2 mt-0.5 flex-shrink-0">
                    <FiUser size={14} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-neutral-800">{r.name}</span>
                      <span className="text-xs text-neutral-400">#{i + 1} match</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${bgBadge(r.backgroundCheckStatus)}`}>
                        BG: {r.backgroundCheckStatus}
                      </span>
                      {r.reliabilityScore != null && (
                        <span className="text-xs text-neutral-500">
                          {r.reliabilityScore.toFixed(0)}/100 reliability
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-indigo-600 mt-0.5">{r.matchReason}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {r.yearsExperience != null ? `${r.yearsExperience} yrs exp` : ''}
                      {r.hourlyRate != null ? ` · $${r.hourlyRate}/hr` : ''}
                      {r.specialties.length > 0 ? ` · ${r.specialties.slice(0, 3).join(', ')}` : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
