import type { PricingView } from '@/lib/pricing/pricing';

/**
 * OL-202 — one honest price line, rendered from the server-computed
 * pricingView() (whose sourceLabel comes from priceSourceLabel()). Three shapes:
 *   "From $3,200/mo · operator-provided"   (or "$3,200–$4,800/mo · …" for a range)
 *   "~$3,500/mo · estimated from DP network"
 *   "Pricing: contact for a quote"
 * Never an empty "/mo+", never a figure without its source.
 */
export type PriceLineView = Pick<PricingView, 'hasPrice' | 'amount' | 'low' | 'high' | 'source' | 'sourceLabel' | 'familyReportCount'>;

function money(n: number): string {
  return `$${n.toLocaleString('en-US')}`;
}

/** The figure + source text PriceLine renders; exported for tests and non-JSX callers. */
export function priceLineParts(p: PriceLineView | null | undefined): { figure: string | null; source: string } {
  if (!p || !p.hasPrice || p.amount == null) return { figure: null, source: 'Pricing: contact for a quote' };
  switch (p.source) {
    case 'FAMILY_AVG':
      return { figure: `~${money(p.amount)}/mo`, source: `families report (avg of ${p.familyReportCount})` };
    case 'DP_ESTIMATE':
      return { figure: `~${money(p.amount)}/mo`, source: 'estimated from DP network' };
    case 'PUBLIC':
      return { figure: `~${money(p.amount)}/mo`, source: 'estimated from public sources' };
    default: {
      // OPERATOR / AI_CALL: the community said it — show its range when it gave one.
      const range = p.low != null && p.high != null && p.high > p.low ? `${money(p.low)}–${money(p.high)}/mo` : null;
      return { figure: range ?? `From ${money(p.amount)}/mo`, source: p.sourceLabel || 'operator-provided' };
    }
  }
}

export default function PriceLine({ pricing, className = '' }: { pricing: PriceLineView | null | undefined; className?: string }) {
  const { figure, source } = priceLineParts(pricing);
  return (
    <p
      className={`text-sm ${className}`}
      data-testid="price-line"
      data-price-source={pricing?.hasPrice ? pricing.source ?? '' : ''}
    >
      {figure ? (
        <>
          <span className="font-semibold text-neutral-900">{figure}</span>
          <span className="text-neutral-600"> · {source}</span>
        </>
      ) : (
        <span className="text-neutral-600">{source}</span>
      )}
    </p>
  );
}
