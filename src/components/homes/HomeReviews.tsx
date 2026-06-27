'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { FiStar } from 'react-icons/fi';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  isVerified: boolean;
  operatorResponse: string | null;
  operatorRespondedAt: string | null;
  createdAt: string;
}

interface HomeReviewsProps {
  homeId: string;
  homeName: string;
  /** True when the viewer is the operator who owns this claimed home (can reply). */
  canRespond?: boolean;
}

function Stars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <span className={`inline-flex items-center text-amber-500 ${className}`} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <FiStar key={s} className={`h-4 w-4 ${s <= Math.round(rating) ? 'fill-current' : 'text-neutral-300'}`} />
      ))}
    </span>
  );
}

/**
 * First-party reviews on the listing detail page. Reads real reviews from
 * /api/reviews/homes, shows a friendly empty state, and lets a logged-in family
 * who has engaged the home (inquiry/tour/booking) leave one. Operator replies are
 * shown inline. No third-party review text is ever displayed here.
 */
export default function HomeReviews({ homeId, homeName, canRespond = false }: HomeReviewsProps) {
  const { data: session } = useSession();
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');
  const [savingResponse, setSavingResponse] = useState(false);

  const saveResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;
    setSavingResponse(true);
    try {
      const res = await fetch(`/api/reviews/homes/${reviewId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: responseText.trim() }),
      });
      if (res.ok) {
        setRespondingTo(null);
        setResponseText('');
        await load();
      }
    } finally {
      setSavingResponse(false);
    }
  };
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<{ averageRating: number; totalReviews: number }>({ averageRating: 0, totalReviews: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/homes?homeId=${encodeURIComponent(homeId)}`);
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        if (data.stats) setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setError(null);
    if (rating < 1) {
      setError('Please choose a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews/homes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeId, rating, title: title || undefined, content: content || undefined }),
      });
      if (res.ok) {
        setDone(true);
        setShowForm(false);
        setRating(0);
        setTitle('');
        setContent('');
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Could not submit your review.');
      }
    } catch {
      setError('Could not submit your review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-neutral-800">Reviews</h2>
        {stats.totalReviews > 0 && (
          <div className="flex items-center gap-1.5">
            <Stars rating={stats.averageRating} />
            <span className="font-semibold text-neutral-800">{stats.averageRating.toFixed(1)}</span>
            <span className="text-sm text-neutral-500">({stats.totalReviews})</span>
          </div>
        )}
      </div>

      {/* List / empty state */}
      {loading ? (
        <p className="text-sm text-neutral-500">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
          <p className="font-medium text-neutral-700">No reviews yet — be the first.</p>
          <p className="mt-1 text-sm text-neutral-500">
            Have you connected with {homeName} through CareLinkAI? Share your experience to help other families.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-lg border border-neutral-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stars rating={r.rating} />
                  {r.isVerified && (
                    <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-700">Verified family</span>
                  )}
                </div>
                <span className="text-xs text-neutral-400">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.title && <p className="font-medium text-neutral-800">{r.title}</p>}
              {r.content && <p className="mt-1 text-neutral-700">{r.content}</p>}
              <p className="mt-2 text-xs text-neutral-400">— CareLinkAI member</p>

              {r.operatorResponse && (
                <div className="mt-3 rounded-md border-l-2 border-primary-300 bg-primary-50 p-3">
                  <p className="text-xs font-semibold text-primary-800">Response from {homeName}</p>
                  <p className="mt-0.5 text-sm text-neutral-700">{r.operatorResponse}</p>
                </div>
              )}

              {canRespond && !r.operatorResponse && (
                respondingTo === r.id ? (
                  <div className="mt-3">
                    <textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Write a public response to this review…"
                      rows={3}
                      maxLength={2000}
                      className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => saveResponse(r.id)}
                        disabled={savingResponse}
                        className="rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {savingResponse ? 'Posting…' : 'Post response'}
                      </button>
                      <button type="button" onClick={() => setRespondingTo(null)} className="text-sm text-neutral-500 hover:text-neutral-700">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setRespondingTo(r.id); setResponseText(''); }}
                    className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Respond as the operator
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {/* Submit */}
      <div className="mt-5">
        {done ? (
          <p className="rounded-md bg-success-50 px-4 py-3 text-sm text-success-700">
            Thanks for sharing your experience — your review is now live.
          </p>
        ) : !session?.user ? (
          <a href="/auth/login" className="text-sm font-medium text-primary-600 hover:text-primary-700">
            Log in to write a review →
          </a>
        ) : !showForm ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-50"
          >
            Write a review
          </button>
        ) : (
          <div className="rounded-lg border border-neutral-200 bg-white p-5">
            <p className="mb-2 text-sm font-medium text-neutral-700">Your rating</p>
            <div className="mb-3 flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)} aria-label={`${s} star${s > 1 ? 's' : ''}`}>
                  <FiStar className={`h-7 w-7 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-300 hover:text-amber-300'}`} />
                </button>
              ))}
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              maxLength={120}
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`What was your experience with ${homeName}?`}
              rows={4}
              className="mb-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              maxLength={2000}
            />
            {error && <p className="mb-2 text-sm text-error-600">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit review'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-neutral-500 hover:text-neutral-700">
                Cancel
              </button>
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              You can review a community after you&apos;ve inquired, requested a tour, or booked it through CareLinkAI.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
