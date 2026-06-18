/**
 * CNOS feature flags — DEFAULT OFF.
 *
 * These gate behaviors that conflict with the CNOS decisions ratified by Chris on
 * 2026-06-08 (after the shift-fill engine landed 2026-05-07):
 *   - NO household-employer lane (CareLinkAI does not place caregivers directly
 *     with private households as employer/intermediary)
 *   - the unaffiliated-caregiver marketplace is FROZEN
 *
 * The shift-fill engine implemented both (see docs/SHIFT_FILL_ENGINE_AUDIT.md, C1/C2).
 * Until the attorney consult un-gates them, both default OFF so the frozen
 * behaviors cannot be exercised in production. Flip to "1" only on legal sign-off.
 */

/**
 * Household-employer lane: the family-posts-listing -> hires -> schedules-shifts
 * flow (HouseholdShift, /api/family/household, the "My Household" UI). NEXT_PUBLIC
 * so both server routes and client UI read the same value (rebuild to flip).
 */
export function isHouseholdEmployerLaneEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_HOUSEHOLD_EMPLOYER_LANE === '1';
}

/**
 * On-call dispatch to UNAFFILIATED caregivers (no employment relationship).
 * When off, the dispatcher only contacts the operator's own employed caregivers.
 */
export function isUnaffiliatedDispatchEnabled(): boolean {
  return process.env.ENABLE_UNAFFILIATED_DISPATCH === '1';
}
