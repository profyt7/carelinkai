/**
 * fix/hero-primary-cta (item 2): the confirmation date as visible text next to a listing's price and availability,
 * not only in a badge tooltip. "Last confirmed Oct 21, 2026", or "Not yet confirmed" when there is no date.
 * The date is the community's own confirmation (availabilityVerifiedAt from a reviewed source; the price's
 * priceUpdatedAt only when the community gave the price), so an estimate never reads as confirmed.
 */
export function lastConfirmedLabel(iso: string | null | undefined): string {
  if (!iso) return 'Not yet confirmed';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Not yet confirmed';
  return `Last confirmed ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' })}`;
}

export default function LastConfirmed({ at, testId, className = '' }: { at: string | null | undefined; testId: string; className?: string }) {
  return (
    <p className={`text-xs text-neutral-600 ${className}`} data-testid={testId} data-confirmed-at={at ?? ''}>
      {lastConfirmedLabel(at)}
    </p>
  );
}
