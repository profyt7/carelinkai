import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatDistance } from 'date-fns';
import { FiStar, FiExternalLink } from 'react-icons/fi';
import ReviewTrigger from './ReviewTrigger';

export const dynamic = 'force-dynamic';

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar
          key={s}
          className={`${sz} ${s <= Math.round(rating) ? 'text-warning-400 fill-warning-400' : 'text-neutral-200'}`}
        />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-500">
      <span className="w-14 text-right">{label}</span>
      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className="h-full bg-warning-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-right">{count}</span>
    </div>
  );
}

export default async function OperatorReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/auth/login');

  // Find operator record
  const operator = await prisma.operator.findFirst({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!operator) redirect('/operator');

  // All marketplace hires where this operator posted the listing
  const hires = await prisma.marketplaceHire.findMany({
    where: {
      listing: { postedByUserId: session.user.id },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      caregiver: {
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, profileImageUrl: true },
          },
          reviews: {
            select: { id: true, rating: true, title: true, content: true, reviewerId: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      listing: { select: { id: true, title: true } },
    },
  });

  // Deduplicate by caregiverId — keep earliest hire per caregiver, aggregate reviews
  const seen = new Set<string>();
  const caregiverMap = new Map<
    string,
    {
      caregiverId: string;
      firstName: string;
      lastName: string;
      profileImageUrl: any;
      userId: string;
      hiredAgo: string;
      listingTitle: string;
      listingId: string;
      reviews: typeof hires[0]['caregiver']['reviews'];
      avgRating: number;
      alreadyReviewed: boolean;
    }
  >();

  for (const hire of hires) {
    const cg = hire.caregiver;
    if (seen.has(cg.id)) continue;
    seen.add(cg.id);

    const reviews = cg.reviews;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0;
    const alreadyReviewed = reviews.some((r) => r.reviewerId === session.user.id);

    caregiverMap.set(cg.id, {
      caregiverId: cg.id,
      firstName: cg.user.firstName ?? '',
      lastName: cg.user.lastName ?? '',
      profileImageUrl: cg.user.profileImageUrl,
      userId: cg.user.id,
      hiredAgo: formatDistance(new Date(hire.createdAt), new Date(), { addSuffix: true }),
      listingTitle: hire.listing?.title ?? 'Unknown listing',
      listingId: hire.listing?.id ?? '',
      reviews,
      avgRating,
      alreadyReviewed,
    });
  }

  const entries = Array.from(caregiverMap.values());
  const totalReviewed = entries.filter((e) => e.alreadyReviewed).length;
  const totalPending = entries.filter((e) => !e.alreadyReviewed && e.reviews.length === 0).length;

  function getProfileImage(profileImageUrl: any): string | null {
    if (!profileImageUrl) return null;
    if (typeof profileImageUrl === 'string') return profileImageUrl;
    return profileImageUrl.medium ?? profileImageUrl.thumbnail ?? profileImageUrl.large ?? null;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900 mb-1">Caregiver Reviews</h1>
        <p className="text-neutral-500">
          {entries.length === 0
            ? 'No caregivers hired through the marketplace yet'
            : `${entries.length} hired · ${totalReviewed} reviewed · ${totalPending} awaiting your review`}
        </p>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-10 text-center">
          <div className="text-5xl mb-4">⭐</div>
          <h3 className="text-lg font-semibold text-neutral-900 mb-2">No hires yet</h3>
          <p className="text-neutral-600 mb-6">
            Once you hire a caregiver through the marketplace you can leave them a review here.
          </p>
          <Link
            href="/marketplace"
            className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
          >
            Browse Marketplace
          </Link>
        </div>
      )}

      {/* Caregiver list */}
      {entries.length > 0 && (
        <div className="space-y-6">
          {entries.map((entry) => {
            const img = getProfileImage(entry.profileImageUrl);

            // Rating breakdown
            const breakdown = [5, 4, 3, 2, 1].map((star) => ({
              star,
              count: entry.reviews.filter((r) => r.rating === star).length,
            }));

            return (
              <div
                key={entry.caregiverId}
                className="bg-white border border-neutral-200 rounded-xl overflow-hidden"
              >
                {/* Card header */}
                <div className="p-5 flex items-start gap-4 border-b border-neutral-100">
                  {/* Avatar */}
                  <div className="h-14 w-14 rounded-full bg-neutral-200 flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl font-medium text-neutral-500">
                        {entry.firstName[0]}{entry.lastName[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h2 className="text-base font-semibold text-neutral-900">
                          {entry.firstName} {entry.lastName}
                        </h2>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          Hired {entry.hiredAgo} via "{entry.listingTitle}"
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/marketplace/caregivers/${entry.caregiverId}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-neutral-600 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
                        >
                          <FiExternalLink className="h-3 w-3" />
                          Profile
                        </Link>
                        {!entry.alreadyReviewed ? (
                          <ReviewTrigger
                            caregiverId={entry.caregiverId}
                            caregiverName={`${entry.firstName} ${entry.lastName}`}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-success-700 bg-success-50 border border-success-200 rounded-lg">
                            ✓ Reviewed
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rating summary */}
                    {entry.reviews.length > 0 && (
                      <div className="mt-3 flex items-center gap-3">
                        <StarDisplay rating={entry.avgRating} size="sm" />
                        <span className="text-sm font-semibold text-neutral-800">
                          {entry.avgRating.toFixed(1)}
                        </span>
                        <span className="text-xs text-neutral-400">
                          ({entry.reviews.length} review{entry.reviews.length !== 1 ? 's' : ''})
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reviews */}
                {entry.reviews.length > 0 && (
                  <div className="p-5">
                    <div className="flex gap-8">
                      {/* Bar chart */}
                      <div className="w-36 space-y-1.5 flex-shrink-0">
                        {breakdown.map(({ star, count }) => (
                          <RatingBar
                            key={star}
                            label={`${star} star`}
                            count={count}
                            total={entry.reviews.length}
                          />
                        ))}
                      </div>

                      {/* Latest reviews */}
                      <div className="flex-1 space-y-3 min-w-0">
                        {entry.reviews.slice(0, 3).map((r) => (
                          <div key={r.id} className="border-l-2 border-neutral-100 pl-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <StarDisplay rating={r.rating} size="sm" />
                              {r.title && (
                                <span className="text-xs font-medium text-neutral-800 truncate">
                                  {r.title}
                                </span>
                              )}
                            </div>
                            {r.content && (
                              <p className="text-xs text-neutral-600 line-clamp-2">{r.content}</p>
                            )}
                            <p className="text-xs text-neutral-400 mt-0.5">
                              {formatDistance(new Date(r.createdAt), new Date(), { addSuffix: true })}
                            </p>
                          </div>
                        ))}
                        {entry.reviews.length > 3 && (
                          <Link
                            href={`/marketplace/caregivers/${entry.caregiverId}`}
                            className="text-xs text-primary-600 hover:underline"
                          >
                            View all {entry.reviews.length} reviews →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* No reviews yet */}
                {entry.reviews.length === 0 && (
                  <div className="px-5 py-4 text-sm text-neutral-400 italic">
                    No reviews yet for this caregiver.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
