'use client';

import { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  points: number;
  type: string;
  description: string;
  createdAt: string;
}

interface Summary {
  totalPoints: number;
  lifetimePoints: number;
  tier: string;
  transactions: Transaction[];
}

const TIER_CONFIG = {
  BRONZE:   { color: 'text-amber-700',   bg: 'bg-amber-100',   bar: 'bg-amber-500',   next: 100,  label: 'Bronze',   emoji: '🥉' },
  SILVER:   { color: 'text-slate-600',   bg: 'bg-slate-100',   bar: 'bg-slate-400',   next: 300,  label: 'Silver',   emoji: '🥈' },
  GOLD:     { color: 'text-warning-600',  bg: 'bg-warning-50',   bar: 'bg-warning-500',  next: 700,  label: 'Gold',     emoji: '🥇' },
  PLATINUM: { color: 'text-indigo-600',  bg: 'bg-indigo-50',   bar: 'bg-indigo-500',  next: null, label: 'Platinum', emoji: '💎' },
};

const EVENT_LABELS: Record<string, string> = {
  ON_TIME_SHIFT:    'On-time arrival',
  STREAK_5_SHIFTS:  '5-shift streak bonus',
  NO_CALLOFF_30_DAYS: '30-day no call-off bonus',
  POSITIVE_REVIEW:  'Positive resident review',
  SHIFT_COMPLETED:  'Shift completed',
  CALL_OFF_PENALTY: 'Call-off recorded',
  REDEMPTION:       'Points redeemed',
  BONUS:            'Bonus awarded',
};

export default function PointsDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/caregiver/points')
      .then((r) => r.json())
      .then((d) => setSummary(d.summary))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-neutral-400 py-4 text-center">Loading points...</div>;
  if (!summary) return null;

  const tier = TIER_CONFIG[summary.tier as keyof typeof TIER_CONFIG] ?? TIER_CONFIG.BRONZE;
  const progress = tier.next
    ? Math.min(100, (summary.lifetimePoints / tier.next) * 100)
    : 100;

  return (
    <div className="space-y-6">
      {/* Tier + balance card */}
      <div className={`rounded-xl ${tier.bg} border border-neutral-200 p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Your Tier</p>
            <p className={`text-2xl font-bold ${tier.color}`}>{tier.emoji} {tier.label}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">Available Points</p>
            <p className="text-3xl font-bold text-neutral-900">{summary.totalPoints.toLocaleString()}</p>
          </div>
        </div>

        {tier.next && (
          <div>
            <div className="flex justify-between text-xs text-neutral-500 mb-1">
              <span>{summary.lifetimePoints} lifetime pts</span>
              <span>{tier.next} for next tier</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-200 overflow-hidden">
              <div className={`h-full rounded-full ${tier.bar} transition-all`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
        {!tier.next && (
          <p className={`text-sm font-medium ${tier.color}`}>You've reached the highest tier! 🎉</p>
        )}
      </div>

      {/* How to earn */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="font-semibold text-neutral-800 mb-3">How to Earn Points</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['On-time arrival', '+5 pts'],
            ['5-shift streak', '+10 pts bonus'],
            ['30 days no call-off', '+20 pts'],
            ['4+ star review', '+15 pts'],
            ['Shift completed', '+3 pts'],
          ].map(([action, pts]) => (
            <div key={action} className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
              <span className="text-neutral-600">{action}</span>
              <span className="font-semibold text-success-600">{pts}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      {summary.transactions.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h3 className="font-semibold text-neutral-800 mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {summary.transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-neutral-50 last:border-0">
                <div>
                  <p className="text-sm text-neutral-700">{t.description}</p>
                  <p className="text-xs text-neutral-400">
                    {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${t.points >= 0 ? 'text-success-600' : 'text-error-500'}`}>
                  {t.points >= 0 ? '+' : ''}{t.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
