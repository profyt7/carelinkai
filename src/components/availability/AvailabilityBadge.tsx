/**
 * "Verified <date>" badge + honest freshness line (OL-110, OL-163d). Renders
 * from the server-computed availabilityView (never fakes "live"): a green
 * badge with the verification date (+ count when known) when fresh, or a
 * neutral "Contact to confirm" when stale/unknown. Only QA-approved sources
 * ever set availabilityVerifiedAt, so a badge is always a reviewed fact.
 */
export type AvailabilityViewProp = {
  fresh: boolean;
  count: number | null;
  verifiedAt: string | null;
  label: string;
  badge: boolean;
};

/** "Oct 21" in Cleveland time; deterministic between server and client. */
export function verifiedDateLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'America/New_York' });
}

export default function AvailabilityBadge({
  availability,
  className = '',
}: {
  availability?: AvailabilityViewProp | null;
  className?: string;
}) {
  if (!availability) return null;

  if (availability.fresh) {
    const date = verifiedDateLabel(availability.verifiedAt);
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 ring-1 ring-inset ring-success-200 ${className}`}
        title={availability.label}
        aria-label={`Verified Availability — ${availability.label}`}
        data-testid="availability-badge"
        data-verified-at={availability.verifiedAt ?? ''}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 111.4-1.4l3.3 3.29 6.8-6.8a1 1 0 011.4 0z"
            clipRule="evenodd"
          />
        </svg>
        {date ? `Verified ${date}` : 'Verified Availability'}
        {availability.count != null && (
          <span className="font-semibold">· {availability.count} open</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 ${className}`}
      data-testid="availability-badge"
      data-verified-at=""
    >
      Contact to confirm availability
    </span>
  );
}
