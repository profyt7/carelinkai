import Link from 'next/link';
import { FiMapPin } from 'react-icons/fi';
import AvailabilityBadge from '@/components/availability/AvailabilityBadge';
import GoogleRatingBadge from '@/components/homes/GoogleRatingBadge';
import type { PublicListing } from '@/lib/directory/public-listings';

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
      className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-primary-400 hover:shadow-md"
    >
      <Link href={l.href} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> keeps the card static HTML; images are Cloudinary/placeholder URLs */}
        <img
          src={l.photoUrl}
          alt={l.photoIsPlaceholder ? `Representative photo for ${l.name}` : l.name}
          loading={priority ? 'eager' : 'lazy'}
          className="h-44 w-full object-cover"
        />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <AvailabilityBadge availability={l.availability} />
          <GoogleRatingBadge rating={l.rating} count={l.ratingCount} compact />
        </div>
        <h3 className="mt-3 text-lg font-bold text-neutral-900">
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
          <p className="mt-2 text-sm text-neutral-700">{l.careLevelLabels.join(' · ')}</p>
        )}
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
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            View listing →
          </Link>
        </div>
      </div>
    </article>
  );
}
