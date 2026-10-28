'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Confirm step for a token-authorized claim. Re-arms the operator's seededHomeId via the
 * existing POST /api/operator/claim, then routes into the onboarding claim UI (step 2),
 * which collects the image-rights acknowledgment and performs the ownership transfer.
 * Explicit button (no claim-on-page-load side effect).
 */
export default function ClaimConfirm({ token, homeName }: { token: string; homeName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operator/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not start the claim. Please try again.');
      router.push('/operator/onboarding/2');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <div className="text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Claim {homeName}</h1>
      <p className="mt-3 text-slate-600">
        You’re claiming this CareLinkAI listing for your account. On the next screen you’ll review the
        details and confirm — there’s no cost to claim or keep your listing.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <button
        onClick={start}
        disabled={loading}
        className="mt-6 inline-block rounded-lg bg-teal-600 px-6 py-3 font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {loading ? 'Starting…' : `Claim ${homeName}`}
      </button>
    </div>
  );
}
