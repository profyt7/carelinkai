'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiAlertTriangle, FiAlertCircle, FiChevronRight } from 'react-icons/fi';

interface AtRiskCaregiver {
  id: string;
  name: string;
  reliabilityScore: number | null;
  risk: {
    level: 'HIGH' | 'MEDIUM';
    factors: string[];
    score: number;
  };
}

const LEVEL_STYLES = {
  HIGH:   { bg: 'bg-red-50',    border: 'border-red-200',    badge: 'bg-red-100 text-red-700',   icon: FiAlertCircle,  label: 'High Risk' },
  MEDIUM: { bg: 'bg-amber-50',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-700', icon: FiAlertTriangle, label: 'Medium Risk' },
};

export default function AtRiskAidesWidget() {
  const [caregivers, setCaregivers] = useState<AtRiskCaregiver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/operator/caregivers/at-risk')
      .then((r) => r.json())
      .then((d) => setCaregivers(d.caregivers ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || caregivers.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-red-100 p-1.5">
            <FiAlertTriangle size={14} className="text-red-600" />
          </div>
          <h3 className="font-semibold text-neutral-800 text-sm">
            At-Risk Aides
            <span className="ml-1.5 text-xs font-normal bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">
              {caregivers.length}
            </span>
          </h3>
        </div>
        <Link href="/operator/caregivers" className="text-xs text-indigo-600 hover:underline">
          View all
        </Link>
      </div>

      <div className="space-y-2">
        {caregivers.slice(0, 4).map((c) => {
          const style = LEVEL_STYLES[c.risk.level];
          const Icon = style.icon;
          return (
            <Link
              key={c.id}
              href={`/operator/caregivers/${c.id}`}
              className={`flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} p-3 hover:opacity-80 transition-opacity`}
            >
              <Icon size={16} className={c.risk.level === 'HIGH' ? 'text-red-500 mt-0.5 flex-shrink-0' : 'text-amber-500 mt-0.5 flex-shrink-0'} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-neutral-800 truncate">{c.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style.badge}`}>
                    {style.label}
                  </span>
                </div>
                {c.risk.factors.length > 0 && (
                  <p className="text-xs text-neutral-500 mt-0.5 truncate">{c.risk.factors[0]}</p>
                )}
              </div>
              <FiChevronRight size={14} className="text-neutral-400 mt-0.5 flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
