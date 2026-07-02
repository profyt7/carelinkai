/**
 * "Verified Availability" badge + honest freshness line (OL-110). Renders from the
 * server-computed availabilityView (never fakes "live"): a green badge + verified
 * date/count when fresh, or a neutral "Contact to confirm" when stale/unknown.
 */
export type AvailabilityViewProp = {
  fresh: boolean;
  count: number | null;
  verifiedAt: string | null;
  label: string;
  badge: boolean;
};

export default function AvailabilityBadge({
  availability,
  className = '',
}: {
  availability?: AvailabilityViewProp | null;
  className?: string;
}) {
  if (!availability) return null;

  if (availability.fresh) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 ring-1 ring-inset ring-success-200 ${className}`}
        title={availability.label}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.29 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
        Verified Availability
        {availability.count != null && (
          <span className="font-semibold">· {availability.count} open</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500 ${className}`}
    >
      Contact to confirm availability
    </span>
  );
}
