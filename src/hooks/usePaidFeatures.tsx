'use client';

/**
 * OL-186 — client read of the paid-feature kill switches (/api/paid-features).
 * Every flag reads as OFF until the server answers, so a paid button never
 * flashes on for a feature that is switched off.
 */

import useSWR from 'swr';
import type { ReactNode } from 'react';
import type { PaidFeatureFlags, PaidFeatureKey } from '@/lib/billing/paid-features';

const fetcher = async (url: string): Promise<Partial<PaidFeatureFlags>> => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return {};
  return r.json();
};

export function usePaidFeatures() {
  const { data, isLoading } = useSWR('/api/paid-features', fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
  return {
    loading: isLoading,
    isEnabled: (key: PaidFeatureKey) => data?.[key] === true,
  };
}

export function usePaidFeature(key: PaidFeatureKey) {
  const { loading, isEnabled } = usePaidFeatures();
  return { loading, enabled: isEnabled(key) };
}

/** Plain "not available yet" panel for a paid page whose feature is off. */
export function PaidFeatureUnavailable({ title, message }: { title: string; message?: string }) {
  return (
    <div className="mx-auto max-w-xl p-6" data-testid="paid-feature-unavailable">
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
        <p className="mt-2 text-sm text-neutral-600">{message ?? 'This is not available yet.'}</p>
      </div>
    </div>
  );
}

/** Renders children only when the feature is on; the unavailable panel otherwise. */
export function PaidFeatureGate({ feature, title, message, children }: { feature: PaidFeatureKey; title: string; message?: string; children: ReactNode }) {
  const { loading, enabled } = usePaidFeature(feature);
  if (loading) return <div className="p-8 text-center text-sm text-neutral-500">Loading…</div>;
  if (!enabled) return <PaidFeatureUnavailable title={title} message={message} />;
  return <>{children}</>;
}
