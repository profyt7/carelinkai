import Link from 'next/link';
import { listingRelatedLinks, type ListingLinkInput } from '@/lib/seo/listing-meta';

/**
 * OL-172 (f) — every listing links back to its suburb page (when its city has
 * one) and to the care-type hubs it belongs to. No hooks, so it renders in the
 * client listing page as well as on the server.
 */
export default function ListingRelatedLinks({ listing }: { listing: ListingLinkInput }) {
  const { suburb, hubs } = listingRelatedLinks(listing);
  return (
    <nav aria-label="More homes like this" className="mb-8 rounded-2xl border border-neutral-200 bg-white p-6" data-testid="listing-related-links">
      <h2 className="text-lg font-semibold text-neutral-800">More homes like this</h2>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {suburb && (
          <li>
            <Link href={suburb.href} className="font-medium text-primary-700 hover:underline" data-testid="listing-suburb-link">
              {suburb.name} →
            </Link>
          </li>
        )}
        {hubs.map((h) => (
          <li key={h.href}>
            <Link href={h.href} className="font-medium text-primary-700 hover:underline" data-testid="listing-hub-link">
              {h.label} →
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
