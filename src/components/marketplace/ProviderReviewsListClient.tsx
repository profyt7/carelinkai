"use client";

import { useState, useEffect } from "react";
import { formatDistance } from "date-fns";
import { FiStar, FiEdit } from "react-icons/fi";
import { useSession } from "next-auth/react";

type Review = { id: string; rating: number; title?: string | null; content?: string | null; createdAt: string };
type Stats = { averageRating: number; totalReviews: number };

interface Props {
  providerId: string;
}

export default function ProviderReviewsListClient({ providerId }: Props) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ rating: 5, title: "", content: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/reviews/providers?providerId=${providerId}&limit=10`);
      if (!res.ok) return;
      const json = await res.json();
      setReviews(json.reviews || []);
      setStats(json.stats || { averageRating: 0, totalReviews: 0 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [providerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reviews/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit review");
      setSubmitted(true);
      setShowForm(false);
      await load();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, interactive = false) => (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className={`text-xl cursor-${interactive ? "pointer" : "default"} ${i < rating ? "text-warning-400" : "text-neutral-300"}`}
          onClick={interactive ? () => setForm((f) => ({ ...f, rating: i + 1 })) : undefined}
        >
          ★
        </span>
      ))}
    </span>
  );

  if (loading) return null;

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
          <FiStar className="text-warning-400" />
          Reviews
          {stats.totalReviews > 0 && (
            <span className="text-sm font-normal text-neutral-500">
              ({stats.averageRating.toFixed(1)} · {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""})
            </span>
          )}
        </h3>
        {session?.user && !submitted && (
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <FiEdit size={14} />
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Rating</label>
            {renderStars(form.rating, true)}
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Title (optional)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Summary of your experience"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Review (optional)</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={3}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm resize-none"
              placeholder="Share your experience with this provider..."
            />
          </div>
          {submitError && <p className="text-sm text-error-700">{submitError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Review"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className="mb-4 rounded-md bg-success-50 border border-success-200 px-4 py-3 text-sm text-success-700">
          Thank you for your review!
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-neutral-500">No reviews yet. Be the first to review this provider.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border border-neutral-200 rounded-md p-3 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {renderStars(r.rating)}
                  <span className="text-sm text-neutral-500">{r.rating}/5</span>
                </div>
                <span className="text-xs text-neutral-400">
                  {formatDistance(new Date(r.createdAt), new Date(), { addSuffix: true })}
                </span>
              </div>
              {r.title && <p className="mt-2 text-sm font-medium text-neutral-900">{r.title}</p>}
              {r.content && <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{r.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
