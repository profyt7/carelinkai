import Link from 'next/link';
import { FiMapPin } from 'react-icons/fi';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import GoogleRatingBadge from '@/components/homes/GoogleRatingBadge';
import FeaturedBadge from '@/components/homes/FeaturedBadge';
import type { PublicListing } from '@/lib/directory/public-listings';
import { CARD } from '@/components/site/brand';

/**
 * Server-rendered listing card for the public SEO pages (sprint W3 items 3 + 4).
 * No client JS: the card is plain HTML in the response so crawlers (and a
 * logged-out `curl`) see the listing. Business facts only — see
 * src/lib/directory/public-listings.ts for what is (not) included.
 */
export default function ListingCard({ listing, priority = false }: { listing: PublicListing; priority?: boolean }) {
  const l = listing;
  const location = [l.city, l.state].filter(Boolean).join(', ');
  return (
    <article
      data-testid="listing-card"
      data-home-id={l.id}
      className={`flex flex-col overflow-hidden ${CARD}`}
    >
      {/* OL-216: same layout as the /search SearchResultCard — availability over the photo. */}
      <div className="relative">
        <Link href={l.href} className="block">
          {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> keeps the card static HTML; images are Cloudinary/placeholder URLs */}
          <img
            src={l.photoUrl}
            alt={l.photoIsPlaceholder ? `Representative photo for ${l.name}` : l.name}
            loading={priority ? 'eager' : 'lazy'}
            className="h-44 w-full object-cover"
          />
        </Link>
        <div className="absolute left-3 top-3">
          <AvailabilityBadge availability={l.availability} tone="overlay" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        {l.featured && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <FeaturedBadge />
          </div>
        )}
        <h3 className="text-lg font-bold text-neutral-900">
          <Link href={l.href} className="hover:text-primary-700">
            {l.name}
          </Link>
        </h3>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-600">
            <FiMapPin className="h-3.5 w-3.5 flex-shrink-0" />
            {location}
          </p>
        )}
        {l.careLevelLabels.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Care types">
            {l.careLevelLabels.map((c) => (
              <li key={c} className="rounded-lg bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                {c}
              </li>
            ))}
          </ul>
        )}
        <GoogleRatingBadge rating={l.rating} count={l.ratingCount} className="mt-2" />
        <p className="mt-2 text-sm font-medium text-neutral-800">{l.pricing.display}</p>
        {l.medicaidWaiver.line && (
          <p className="mt-2 text-xs text-neutral-700" data-testid="listing-waiver-line" data-waiver-status={l.medicaidWaiver.status}>
            <span className="font-semibold">Medicaid Assisted Living Waiver:</span> {l.medicaidWaiver.line}
            <span className="block text-neutral-500">{l.medicaidWaiver.note}</span>
          </p>
        )}
        <p className="mt-3 text-xs text-neutral-600" data-testid="listing-odh-facts">
          {l.inspections.line}
          {l.odhLicenseNumber ? ` · ODH license ${l.odhLicenseNumber}` : ''}
        </p>
        <div className="mt-auto pt-4">
          <Link
            href={l.href}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-700 hover:text-secondary-600"
          >
            View listing →
          </Link>
        </div>
      </div>
    </article>
  );
}
