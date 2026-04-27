'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

const POSITIONS = [
  'Caregiver',
  'CNA',
  'HHA (Home Health Aide)',
  'Personal Care Aide',
  'Companion',
  'Live-In Caregiver',
  'Medication Aide',
  'Overnight Caregiver',
];

interface Props {
  caregiverId: string;
  caregiverName: string;
  operatorPlan: string | null;
  isMock?: boolean;
}

const PAID_PLANS = new Set(['PROFESSIONAL', 'GROWTH', 'AGENCY']);

export default function DirectHireButton({ caregiverId, caregiverName, operatorPlan, isMock }: Props) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState('Caregiver');
  const [loading, setLoading] = useState(false);
  const [hired, setHired] = useState(false);

  const isPaidPlan = PAID_PLANS.has(operatorPlan ?? '');

  const handleHire = async () => {
    if (isMock) {
      toast.success(`Demo: ${caregiverName} would be hired as ${position}`);
      setHired(true);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/operator/caregivers/${caregiverId}/hire`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hire failed');
      toast.success(`${caregiverName} has been hired as ${position}!`);
      setHired(true);
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to complete hire');
    } finally {
      setLoading(false);
    }
  };

  if (hired) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-success-50 border border-success-200 rounded-lg text-success-800 text-sm font-medium">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Hired — employment record created
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
      >
        Hire {caregiverName.split(' ')[0]}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-neutral-900 mb-1">
              Hire {caregiverName}
            </h2>
            <p className="text-sm text-neutral-500 mb-5">
              This will create an employment record and notify the caregiver.
            </p>

            {/* Plan-aware pricing banner */}
            {isPaidPlan ? (
              <div className="flex items-start gap-2 mb-5 p-3 bg-success-50 border border-success-200 rounded-lg text-sm text-success-800">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Marketplace hire included in your {operatorPlan} plan — no additional fee.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  A <strong>$99 marketplace access fee</strong> applies on the Starter plan. Upgrade to Professional to include unlimited hires.
                </span>
              </div>
            )}

            {/* Position selector */}
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Position
            </label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mb-6"
            >
              {POSITIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 border border-neutral-300 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleHire}
                disabled={loading}
                className="flex-1 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
              >
                {loading
                  ? 'Hiring…'
                  : isPaidPlan
                  ? 'Confirm Hire'
                  : 'Confirm Hire ($99)'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
