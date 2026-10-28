'use client';

import { useState, type MouseEvent, type ReactNode } from 'react';
import { FiHeart, FiMapPin } from 'react-icons/fi';
import AvailabilityBadge, { UNVERIFIED_AVAILABILITY, type AvailabilityViewProp } from '@/components/availability/AvailabilityBadge';
import GoogleRatingBadge from '@/components/homes/GoogleRatingBadge';
import FeaturedBadge from '@/components/homes/FeaturedBadge';
import HomeImagePlaceholder from '@/components/homes/HomeImagePlaceholder';
import PriceLine, { type PriceLineView } from '@/components/ui/PriceLine';
import type { MedicaidWaiverPublicView } from '@/lib/medicaid/waiver';

/**
 * The one search result card (OL-202 spec, on /search since OL-216). Placeholder-first:
 * a listing with no real photo gets HomeImagePlaceholder, not a stock building. Every
 * availability / price claim carries its source + date or says "contact to confirm".
 * /api/search results reach it through `toSearchResultHome` (./adapters).
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
  /** list: horizontal at ≥ md, the grid card below md. */
  variant?: 'grid' | 'list';
  href?: string;
  saved?: boolean;
  comparing?: boolean;
  onSave?: (id: string, e: MouseEvent<HTMLButtonElement>) => void;
  onCompare?: (id: string, e: MouseEvent<HTMLButtonElement>) => void;
  /** Optional page-supplied block under the price (e.g. the AI-match factor chips). */
  insights?: ReactNode;
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
  insights,
  headingLevel = 3,
  className = '',
}: Props) {
  const Heading = `h${headingLevel}` as 'h3';
  const link = href ?? `/homes/${home.id}`;
  const location = [home.address?.city, home.address?.state].filter(Boolean).join(', ');
  // A photo that fails to load falls back to the placeholder, never to a stock building.
  const [broken, setBroken] = useState(false);
  const noPhoto = home.photoIsPlaceholder || !home.imageUrl || broken;
  const list = variant === 'list';
  const imgSize = list ? 'h-44 w-full md:h-full md:min-h-[12rem]' : 'h-44 w-full';

  return (
    <article
      data-testid="search-result-card"
      data-home-id={home.id}
      data-variant={variant}
      className={`group flex flex-col overflow-hidden rounded-xl border border-line bg-surface-raised shadow-card motion-safe:transition-shadow hover:shadow-card-hover ${
        list ? 'md:flex-row' : ''
      } ${className}`}
    >
      <div className={`relative flex-shrink-0 ${list ? 'md:w-1/3' : ''}`}>
        <a href={link} className="block h-full" tabIndex={-1} aria-hidden="true">
          {noPhoto ? (
            <HomeImagePlaceholder className={imgSize} label="Photos coming soon" subtitle="No photos yet" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- same plain <img> as the previous search cards
            <img src={home.imageUrl!} alt="" loading="lazy" onError={() => setBroken(true)} className={`${imgSize} object-cover`} />
          )}
        </a>
        <div className="absolute left-3 top-3">
          <AvailabilityBadge availability={home.availabilityFreshness ?? UNVERIFIED_AVAILABILITY} tone="overlay" />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        {(home.isFeatured || home.isUnclaimed) && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {home.isFeatured && <FeaturedBadge />}
            {home.isUnclaimed && (
              <span data-testid="unclaimed-chip" className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                Unclaimed listing
              </span>
            )}
          </div>
        )}

        <Heading className="text-base font-semibold text-neutral-900">
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

        {insights && <div className="mt-3">{insights}</div>}

        <div className="mt-auto flex items-center gap-2 pt-4">
          <button
            type="button"
            data-testid="card-save"
            onClick={(e) => onSave?.(home.id, e)}
            aria-pressed={saved}
            aria-label={saved ? `Remove ${home.name} from saved homes` : `Save ${home.name}`}
            className={`${CONTROL} h-9 w-9 flex-shrink-0 border ${
              saved ? 'border-error-200 bg-error-50 text-error-600' : 'border-neutral-300 bg-surface-raised text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800 active:bg-neutral-100'
            }`}
          >
            <FiHeart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            data-testid="card-compare"
            onClick={(e) => onCompare?.(home.id, e)}
            aria-pressed={comparing}
            aria-label={`${comparing ? 'Comparing' : 'Compare'} ${home.name}`}
            className={`${CONTROL} h-9 border px-3 ${
              comparing ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-neutral-300 bg-surface-raised text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100'
            }`}
          >
            {comparing ? 'Comparing' : 'Compare'}
          </button>
          <a
            href={link}
            data-testid="card-view-details"
            aria-label={`View details for ${home.name}`}
            className={`${CONTROL} ml-auto h-9 whitespace-nowrap bg-primary-600 px-4 text-white hover:bg-primary-700 active:bg-primary-800`}
          >
            View details
          </a>
        </div>
      </div>
    </article>
  );
}
