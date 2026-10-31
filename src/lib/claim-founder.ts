/**
 * OL-248 — what redeeming a claim link writes on the Operator. Founder status comes only from the link
 * (`payload.clevelandFounder`); an agency / cohort link minted with `false` never makes an operator a
 * founder. Nothing already set is changed: founder status is never cleared, and the founder free period
 * (`freeAccessUntil`) is written once, only when it's empty — claiming another home never resets or
 * extends it. `seededHomeId` follows the link so the seeded home can be claimed. No data migration.
 */

import type { ClaimTokenPayload } from '@/lib/claim-token';

export type FounderFields = { clevelandFounder: boolean; freeAccessUntil: Date | null };

export const FOUNDER_FREE_ACCESS_DAYS = 180;

export function founderUpdateFromClaim(
  existing: FounderFields,
  payload: Pick<ClaimTokenPayload, 'clevelandFounder' | 'homeId'>,
  now: Date = new Date(),
): { clevelandFounder?: true; freeAccessUntil?: Date; seededHomeId: string | null } {
  const data: { clevelandFounder?: true; freeAccessUntil?: Date; seededHomeId: string | null } = { seededHomeId: payload.homeId ?? null };
  if (payload.clevelandFounder === true) {
    if (!existing.clevelandFounder) data.clevelandFounder = true;
    if (!existing.freeAccessUntil) data.freeAccessUntil = new Date(now.getTime() + FOUNDER_FREE_ACCESS_DAYS * 24 * 3600 * 1000);
  }
  return data;
}
