import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { loadHomeDetail, loadLatestInspection } from '@/lib/homes/home-detail';
import ListingDetailClient, { type ListingInspection } from './ListingDetailClient';

/**
 * /homes/[id] — server-rendered listing detail.
 *
 * The listing is loaded here with the same function GET /api/homes/[id] uses (business data only, demo
 * fixtures hidden from signed-out viewers) and passed to the client UI as its initial state, so the first
 * HTML already carries the name, address, care types, Medicaid waiver line, inspection/license tile and
 * "Last confirmed" dates (crawlers, no-JS, first paint). The schema.org JSON-LD comes from layout.tsx.
 *
 * If this server load fails (database hiccup), the client falls back to its own fetch with automatic
 * retries and "Try again" (#96). A missing listing renders the same not-found state the client shows.
 */
export const dynamic = 'force-dynamic';

export default async function HomeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let initialHome: unknown = null;
  let initialInspection: ListingInspection | null | undefined;
  try {
    const session = await getServerSession(authOptions);
    const home = await loadHomeDetail(id, (session?.user?.email as string | undefined) ?? null);
    // Same JSON the API sends (dates as strings), so the client sees one shape either way.
    initialHome = home ? JSON.parse(JSON.stringify(home)) : null;
    if (home) initialInspection = await loadLatestInspection(id).catch(() => undefined);
  } catch {
    initialHome = null; // the client fetch (with retries) takes over
  }
  return <ListingDetailClient initialHome={initialHome} initialInspection={initialInspection} />;
}
