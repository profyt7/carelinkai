import Link from 'next/link';
import ListingCard from '@/components/directory/ListingCard';
import type { CareTypeListingsResult } from '@/lib/directory/care-type-listings';
import { buildListingsItemListJsonLd } from '@/lib/seo/jsonld';
import { SITE_URL } from '@/lib/seo/page-meta';

/**
 * OL-172 (d) — the listings block on a care-type hub: a live count, the real
 * homes (server-rendered cards), an ItemList of exactly those homes, and —
 * when the hub's own type has no data — an explicit note naming the nearest
 * real alternative being shown. Server component, no JS.
 */
export default function CareTypeListingsSection({
  path,
  typeLabel,
  heading,
  result,
}: {
  path: string;
  typeLabel: string;
  heading: string;
  result: CareTypeListingsResult;
}) {
  const { listings, total, fallback, shownLabel } = result;
  const itemList = listings.length
    ? buildListingsItemListJsonLd({ url: `${SITE_URL}${path}`, name: `${shownLabel} homes in Greater Cleveland, OH`, listings })
    : null;
  return (
    <section id="listings" className="max-w-5xl mx-auto px-4 sm:px-6 py-16 scroll-mt-16" data-testid="care-type-listings" data-count={total} data-fallback={fallback ? fallback.label : ''}>
      {itemList && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />}
      <h2 className="text-3xl font-bold text-neutral-900">
        {fallback ? `Nearest option we list: ${fallback.label}` : heading}
        {total > 0 && (
          <span className="ml-3 align-middle text-base font-medium text-neutral-600" data-testid="listings-count">
            {total} licensed {total === 1 ? 'home' : 'homes'}
          </span>
        )}
      </h2>
      {fallback && (
        <p className="mt-4 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 p-4 text-neutral-800" data-testid="care-type-fallback-note">
          We don’t have verified {typeLabel} listings in Greater Cleveland yet, so this page shows real, licensed{' '}
          {fallback.label} homes instead. {fallback.why}
        </p>
      )}
      {listings.length > 0 ? (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3" data-testid="listings-grid">
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l} priority={i < 3} />
            ))}
          </div>
          {total > listings.length && (
            <p className="mt-6 text-sm text-neutral-700">
              Showing {listings.length} of {total}.{' '}
              <Link href="/search" className="font-semibold text-primary-700 hover:underline">
                Search all homes
              </Link>
            </p>
          )}
        </>
      ) : (
        <p className="mt-6 rounded-xl border border-neutral-200 bg-white p-6 text-neutral-700" data-testid="listings-empty">
          No verified homes to show yet. We only list facilities we can match to the Ohio Department of Health roster —{' '}
          <Link href="/cleveland/assisted-living" className="font-semibold text-primary-700 hover:underline">
            browse assisted living across Greater Cleveland
          </Link>
          .
        </p>
      )}
    </section>
  );
}
