import { headers } from "next/headers";
import { formatDistance } from "date-fns";

type Props = {
  caregiverId: string;
  limit?: number;
};

export default async function CaregiverReviewsList({ caregiverId, limit = 5 }: Props) {
  try {
    const cookie = headers().get("cookie") ?? "";
    const res = await fetch(
      `/api/reviews/caregivers?caregiverId=${encodeURIComponent(caregiverId)}&limit=${limit}`,
      { headers: { cookie }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const reviews: Array<{ id: string; rating: number; title?: string; content?: string; createdAt: string }> = json.reviews || [];
    const stats: { averageRating: number; totalReviews: number } = json.stats || { averageRating: 0, totalReviews: 0 };

    if (!reviews.length && (!stats || !stats.totalReviews)) {
      return null;
    }

    const renderStars = (rating: number) => {
      const filled = Math.round(rating || 0);
      return (
        <span className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < filled ? "text-yellow-400" : "text-gray-300"}>★</span>
          ))}
        </span>
      );
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl font-semibold text-gray-900">{stats.averageRating?.toFixed?.(1) ?? "0.0"}</div>
          <div className="text-sm text-gray-600">{stats.totalReviews} review{stats.totalReviews === 1 ? "" : "s"}</div>
        </div>

        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border border-gray-200 rounded-md p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderStars(r.rating)}
                  <span className="text-sm text-gray-500">{r.rating.toFixed(1)}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {formatDistance(new Date(r.createdAt), new Date(), { addSuffix: true })}
                </div>
              </div>
              {r.title && <div className="mt-2 text-sm font-medium text-gray-900">{r.title}</div>}
              {r.content && <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{r.content}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  } catch (e) {
    console.error("Error loading caregiver reviews:", e);
    return null;
  }
}
