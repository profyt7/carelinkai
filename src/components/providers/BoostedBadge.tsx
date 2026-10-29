import { FiTrendingUp } from 'react-icons/fi';

/**
 * Provider Boost badge. Boost buys placement and visibility only. The badge never says
 * "Verified" and looks nothing like the green Verified badge (that one comes from credentials).
 */
export default function BoostedBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const cls = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
  return (
    <span
      data-testid="provider-boosted-badge"
      title="Boosted listing: paid placement, not a verification"
      className={`inline-flex items-center rounded-full border border-warning-300 bg-warning-50 font-medium text-warning-800 ${cls}`}
    >
      <FiTrendingUp className={size === 'md' ? 'mr-1 h-4 w-4' : 'mr-1'} size={size === 'md' ? undefined : 12} aria-hidden="true" />
      Boosted
    </span>
  );
}
