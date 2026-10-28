'use client';

import { FiHeart, FiMapPin } from 'react-icons/fi';
import AvailabilityBadge, { UNVERIFIED_AVAILABILITY, type AvailabilityViewProp } from '@/components/availability/AvailabilityBadge';
import GoogleRatingBadge from '@/components/homes/GoogleRatingBadge';
import FeaturedBadge from '@/components/homes/FeaturedBadge';
import HomeImagePlaceholder from '@/components/homes/HomeImagePlaceholder';
import PriceLine, { type PriceLineView } from '@/components/ui/PriceLine';
import type { MedicaidWaiverPublicView } from '@/lib/medicaid/waiver';

/**
 * OL-202 — the one search result card (image-4 pattern) the rollout will put on
 * /search in place of the two inline copies. Placeholder-first: a listing with
 * no photo gets HomeImagePlaceholder, not a stock building. Every availability /
 * price claim carries its source + date or says "contact to confirm".
 * Not used by any production page yet (OL-202 is a /design-preview spec).
 */
export type SearchResultHome = {
  id: string;
  name: string;
  address: { city?: string | null; state?: string | null } | null;
  careLevel: string[];
  /** Operator / Places photo. null (or photoIsPlaceholder) → HomeImagePlaceholder. */
  imageUrl: string | null;
  photoIsPlaceholder?: boolean;
  availabilityFreshness?: AvailabilityViewProp | null;
  pricing?: PriceLineView | null;
  googleRating?: number | null;
  googleRatingCount?: number | null;
  isFeatured?: boolean;
  isUnclaimed?: boolean;
  medicaidWaiver?: MedicaidWaiverPublicView | null;
};

const CARE_LABEL: Record<string, string> = {
  INDEPENDENT: 'Independent Living',
  ASSISTED: 'Assisted Living',
  MEMORY_CARE: 'Memory Care',
  SKILLED_NURSING: 'Skilled Nursing',
};

type Props = {
  home: SearchResultHome;
  variant?: 'grid' | 'list';
  href?: string;
  saved?: boolean;
  comparing?: boolean;
  onSave?: (id: string) => void;
  onCompare?: (id: string) => void;
  /** Heading level for the home name (default 3: page h1 → results h2 → card h3). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
};

const CONTROL =
  'inline-flex items-center justify-center rounded-lg text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors';

export default function SearchResultCard({
  home,
  variant = 'grid',
  href,
  saved = false,
  comparing = false,
  onSave,
  onCompare,
  headingLevel = 3,
  className = '',
}: Props) {
  const Heading = `h${headingLevel}` as 'h3';
  const link = href ?? `/homes/${home.id}`;
  const location = [home.address?.city, home.address?.state].filter(Boolean).join(', ');
  const noPhoto = home.photoIsPlaceholder || !home.imageUrl;
  const list = variant === 'list';

  const image = noPhoto ? (
    <HomeImagePlaceholder
      className={list ? 'h-full min-h-[11rem] w-full' : 'h-44 w-full'}
      label="Photos coming soon"
      subtitle="No photos yet"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- same plain <img> as the current search cards
    <img src={home.imageUrl!} alt={home.name} loading="lazy" className={`w-full object-cover ${list ? 'h-full min-h-[11rem]' : 'h-44'}`} />
  );

  return (
    <article
      data-testid="search-result-card"
      data-home-id={home.id}
      className={`group flex overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card motion-safe:transition-shadow hover:shadow-card-hover ${
        list ? 'flex-row' : 'flex-col'
      } ${className}`}
    >
      <a href={link} className={`block flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 ${list ? 'w-56' : ''}`} tabIndex={-1} aria-hidden="true">
        {image}
      </a>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-2">
          {home.isFeatured && <FeaturedBadge />}
          <AvailabilityBadge availability={home.availabilityFreshness ?? UNVERIFIED_AVAILABILITY} />
          {home.isUnclaimed && (
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">Unclaimed listing</span>
          )}
        </div>

        <Heading className="mt-3 text-base font-semibold text-neutral-900">
          <a href={link} className="rounded-sm hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            {home.name}
          </a>
        </Heading>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-600">
            <FiMapPin className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {location}
          </p>
        )}

        {home.careLevel.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Care types">
            {home.careLevel.map((c) => (
              <li key={c} className="rounded-lg bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                {CARE_LABEL[c] ?? c}
              </li>
            ))}
          </ul>
        )}

        <GoogleRatingBadge rating={home.googleRating} count={home.googleRatingCount} className="mt-2" />
        <PriceLine pricing={home.pricing} className="mt-2" />

        {home.medicaidWaiver?.line && (
          <p className="mt-2 text-xs text-neutral-700" data-testid="listing-waiver-line" data-waiver-status={home.medicaidWaiver.status}>
            <span className="font-semibold">Medicaid Assisted Living Waiver:</span> {home.medicaidWaiver.line}
            <span className="block text-neutral-600">{home.medicaidWaiver.note}</span>
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 pt-4">
          <button
            type="button"
            onClick={() => onSave?.(home.id)}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${home.name} from saved homes` : `Save ${home.name}`}
            className={`${CONTROL} h-9 w-9 border ${
              saved ? 'border-error-200 bg-error-50 text-error-600' : 'border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 active:bg-neutral-100'
            }`}
          >
            <FiHeart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onCompare?.(home.id)}
            aria-pressed={comparing}
            className={`${CONTROL} h-9 border px-3 ${
              comparing ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100'
            }`}
          >
            {comparing ? 'Comparing' : 'Compare'}
          </button>
          <a href={link} className={`${CONTROL} ml-auto h-9 bg-primary-600 px-4 text-white hover:bg-primary-700 active:bg-primary-800`}>
            View details
          </a>
        </div>
      </div>
    </article>
  );
}
