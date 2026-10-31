'use client';

/**
 * OL-241 — client read of /api/operator/capabilities. Every capability reads as OFF until the server
 * answers (and for anyone who isn't an operator), so an entry point never flashes on for a tool the
 * server would reject.
 */

import useSWR from 'swr';
import type { OperatorCapabilities, OperatorCapability } from '@/lib/operator/capabilities';

const fetcher = async (url: string): Promise<Partial<OperatorCapabilities>> => {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) return {};
  return r.json();
};

/** @param enabled skip the request for roles that never have operator tools */
export function useOperatorCapabilities(enabled = true) {
  const { data } = useSWR(enabled ? '/api/operator/capabilities' : null, fetcher, { revalidateOnFocus: false, dedupingInterval: 60_000 });
  return { has: (key: OperatorCapability) => data?.[key] === true };
}
