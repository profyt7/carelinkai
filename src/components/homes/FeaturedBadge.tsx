import { FiStar } from 'react-icons/fi';

/**
 * OL-191 — "Featured" pill for a home with an active featured window. Text label
 * (not colour alone); render it only when the listing is actually featured.
 */
export default function FeaturedBadge({ className = '' }: { className?: string }) {
  return (
    <span
      data-testid="featured-badge"
      className={`inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2 py-1 text-xs font-medium text-primary-800 shadow-sm ${className}`}
    >
      <FiStar className="mr-1 h-3 w-3" aria-hidden="true" />
      Featured
    </span>
  );
}
