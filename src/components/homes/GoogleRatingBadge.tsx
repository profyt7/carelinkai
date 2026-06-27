import { FiStar, FiExternalLink } from 'react-icons/fi';

interface GoogleRatingBadgeProps {
  rating: number | null | undefined;
  count: number | null | undefined;
  placeId?: string | null;
  /** Compact = card variant (attribution only, no link — keeps traffic on-site). */
  compact?: boolean;
  className?: string;
}

/**
 * Google aggregate-rating trust badge. Rating + review count + attribution only —
 * NEVER review text (Maps Platform ToS). Hidden entirely when there's no rating
 * (never seeded/faked). Secondary to the inquiry/tour CTA: the card variant is
 * non-interactive (no off-site link); the full variant adds a "See reviews on
 * Google" link, opened in a new tab.
 */
export default function GoogleRatingBadge({ rating, count, placeId, compact = false, className = '' }: GoogleRatingBadgeProps) {
  if (rating == null || !count || count <= 0) return null;

  const stars = (
    <span className="inline-flex items-center font-semibold text-neutral-800">
      <FiStar className="mr-0.5 h-3.5 w-3.5 fill-amber-400 text-amber-400" />
      {rating.toFixed(1)}
    </span>
  );

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs text-neutral-600 ${className}`}>
        {stars}
        <span className="text-neutral-500">({count})</span>
        <span className="text-neutral-400">· Google</span>
      </span>
    );
  }

  const reviewsUrl = placeId
    ? `https://search.google.com/local/reviews?placeid=${encodeURIComponent(placeId)}`
    : null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-sm text-neutral-600 ${className}`}>
      {stars}
      <span className="text-neutral-500">{count} Google {count === 1 ? 'review' : 'reviews'}</span>
      {reviewsUrl && (
        <a
          href={reviewsUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 hover:underline"
        >
          See reviews on Google
          <FiExternalLink className="ml-0.5 h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
