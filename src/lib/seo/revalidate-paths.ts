/**
 * OL-159 — the public hub pages that must never go stale: every /cleveland/*
 * landing page, the five suburb pages, the agency page, llms.txt and the
 * sitemap. Each page also sets `revalidate` ≤ 1h on its own; this list is what
 * `POST /api/admin/revalidate` purges on demand (after an import or a deploy).
 */

import { SUBURBS, suburbPath } from '@/lib/directory/suburbs';

export const HUB_REVALIDATE_SECONDS = 3600;

export function hubRevalidatePaths(): string[] {
  return [
    '/',
    '/cleveland',
    '/cleveland/assisted-living',
    ...SUBURBS.map((s) => suburbPath(s)),
    '/cleveland/memory-care',
    '/cleveland/independent-living',
    '/cleveland/nursing-homes',
    '/cleveland/home-care-agencies',
    '/concierge',
    '/llms.txt',
    '/sitemap.xml',
  ];
}

/** Only paths from the known list (or /homes/<id>) may be revalidated on request — never arbitrary strings. */
export function isRevalidatablePath(p: string): boolean {
  return hubRevalidatePaths().includes(p) || /^\/homes\/[A-Za-z0-9_-]{1,64}$/.test(p);
}
