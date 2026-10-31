import { CONCIERGE_OFFER } from '@/lib/concierge/offer';

/**
 * The Family Concierge terms, word for word (pay when ready, 10/31). Shown wherever the concierge is
 * offered and on the request form before submit, so every surface states the same deal: research first,
 * a payment link when the shortlist is ready, the shortlist once it's paid, no charge without a useful
 * shortlist, and no guaranteed opening or placement.
 */
export default function ConciergeTerms({ className = '', testId = 'concierge-terms' }: { className?: string; testId?: string }) {
  return (
    <p className={className} data-testid={testId}>
      {CONCIERGE_OFFER.terms}
    </p>
  );
}
