/**
 * Live-ish AVAILABILITY freshness (OL-110).
 *
 * PRINCIPLE: never store "live" availability — it decays the instant you save it.
 * Store a count + an honest freshness stamp, and treat anything older than
 * AVAILABILITY_FRESH_DAYS as "contact to confirm". Every write channel (SMS poll,
 * email magic-link, AI voice, concierge, operator edit) goes through
 * `updateAvailability` so the stamp + source are always set consistently.
 *
 * Business data only — availability + pricing are NOT PHI.
 */

import { prisma } from '@/lib/prisma';
import type { AvailabilitySource } from '@prisma/client';

/** A verification older than this reads as stale → "Contact to confirm". */
export const AVAILABILITY_FRESH_DAYS = 10;
const DAY_MS = 86_400_000;
/** Guardrail: reject absurd counts from a fat-fingered reply / spoofed webhook. */
export const MAX_AVAILABILITY_COUNT = 999;

export function isAvailabilityFresh(verifiedAt: Date | string | null | undefined, now: number = Date.now()): boolean {
  if (!verifiedAt) return false;
  const t = new Date(verifiedAt).getTime();
  if (Number.isNaN(t)) return false;
  return now - t <= AVAILABILITY_FRESH_DAYS * DAY_MS;
}

/** Human freshness label, e.g. "verified today" / "verified 3 days ago". */
export function verifiedRelativeLabel(verifiedAt: Date | string | null | undefined, now: number = Date.now()): string {
  if (!verifiedAt) return '';
  const t = new Date(verifiedAt).getTime();
  if (Number.isNaN(t)) return '';
  const days = Math.floor((now - t) / DAY_MS);
  if (days <= 0) return 'verified today';
  if (days === 1) return 'verified yesterday';
  if (days <= 7) return `verified ${days} days ago`;
  const weeks = Math.floor(days / 7);
  return `verified ${weeks} week${weeks === 1 ? '' : 's'} ago`;
}

export type AvailabilityView = {
  fresh: boolean;
  /** count only when fresh — a stale count is meaningless and must not be shown as fact. */
  count: number | null;
  source: AvailabilitySource | null;
  verifiedAt: string | null;
  /** UI line: "Availability verified today · 3 openings" or "Contact to confirm". */
  label: string;
  badge: boolean; // show the "Verified Availability" badge
};

/** Shape the stored fields into an honest, presentation-ready view. Never fakes "live". */
export function availabilityView(home: {
  availabilityCount?: number | null;
  availabilityVerifiedAt?: Date | string | null;
  availabilitySource?: AvailabilitySource | null;
}, now: number = Date.now()): AvailabilityView {
  const fresh = isAvailabilityFresh(home.availabilityVerifiedAt ?? null, now);
  const count = fresh ? (home.availabilityCount ?? null) : null;
  const rel = verifiedRelativeLabel(home.availabilityVerifiedAt ?? null, now);
  let label: string;
  if (fresh) {
    const openings = count == null ? '' : ` · ${count} opening${count === 1 ? '' : 's'}`;
    label = `Availability ${rel}${openings}`;
  } else {
    label = 'Contact to confirm availability';
  }
  return {
    fresh,
    count,
    source: fresh ? (home.availabilitySource ?? null) : null,
    verifiedAt: home.availabilityVerifiedAt ? new Date(home.availabilityVerifiedAt).toISOString() : null,
    label,
    badge: fresh,
  };
}

/** Normalize a US phone to E.164 (+1XXXXXXXXXX) for consistent storage + matching. */
export function toE164(phone: string | null | undefined): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

/** Clamp an incoming count to a sane non-negative integer, or null if unparseable. */
export function normalizeCount(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '').trim(), 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(MAX_AVAILABILITY_COUNT, Math.trunc(n)));
}

/**
 * THE single write path for availability across all channels. Sets the count, stamps
 * `availabilityVerifiedAt = now`, and records the source. Auth/consent is the
 * CALLER's responsibility (each channel gates its own writes). Returns the fresh view.
 */
export async function updateAvailability(params: {
  homeId: string;
  count: number | null;
  source: AvailabilitySource;
}): Promise<AvailabilityView | null> {
  const count = params.count == null ? null : normalizeCount(params.count);
  const home = await prisma.assistedLivingHome.update({
    where: { id: params.homeId },
    data: {
      availabilityCount: count,
      availabilityVerifiedAt: new Date(),
      availabilitySource: params.source,
    },
    select: { availabilityCount: true, availabilityVerifiedAt: true, availabilitySource: true },
  });
  return availabilityView(home);
}
