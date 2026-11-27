import { formatLastUpdated } from '@/lib/directory/public-listings';

/**
 * "Listings last updated <date>." for a directory hub's page note. The date comes from the listings the
 * page shows (latestPublicListingUpdate over that page's own filter); with no date (no listings, DB
 * error) nothing is rendered rather than a guessed or hard-coded date.
 */
export default function ListingsLastUpdated({ at }: { at: Date | null }) {
  if (!at) return null;
  return (
    <span data-testid="hub-last-updated" data-updated-at={at.toISOString()}>
      {`Listings last updated ${formatLastUpdated(at)}. `}
    </span>
  );
}
