/**
 * TIMESHEET_PAYOUTS_ENABLED (OL-185): unset / anything but 1|true|yes|on = OFF.
 *
 * `/api/timesheets/[id]/pay` transfers platform funds to a caregiver. No step
 * charges the operator for the timesheet first, so turning this on pays
 * caregivers out of the platform balance. Leave it off until an operator
 * charge exists.
 */
export function isTimesheetPayoutsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = (env.TIMESHEET_PAYOUTS_ENABLED ?? '').toString().trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
}
