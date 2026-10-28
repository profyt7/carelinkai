"use client";

import { useState } from "react";
import { FiStar, FiX, FiCheck, FiAlertCircle } from "react-icons/fi";

interface LeaveReviewModalProps {
  caregiverId: string;
  caregiverName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none"
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          <FiStar
            className={`h-7 w-7 transition-colors ${
              star <= (hovered || value)
                ? "text-warning-400 fill-warning-400"
                : "text-neutral-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function LeaveReviewModal({
  caregiverId,
  caregiverName,
  onClose,
  onSuccess,
}: LeaveReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews/caregivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caregiverId,
          rating,
          title: title.trim() || undefined,
          content: content.trim() || undefined,
          isPublic: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit review");
      }

      setSubmitted(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-neutral-900">
            Leave a Review
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-3">
              <FiCheck className="h-6 w-6 text-success-600" />
            </div>
            <p className="text-sm font-semibold text-neutral-900 mb-1">Review submitted!</p>
            <p className="text-xs text-neutral-500 mb-5">
              Thank you for reviewing {caregiverName}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="text-sm text-neutral-500 mb-4">
              How was your experience hiring{" "}
              <span className="font-medium text-neutral-800">{caregiverName}</span>?
            </p>

            {/* Star rating */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Rating <span className="text-error-500">*</span>
              </label>
              <div className="flex items-center gap-3">
                <StarRating value={rating} onChange={setRating} />
                {rating > 0 && (
                  <span className="text-sm font-medium text-neutral-600">
                    {RATING_LABELS[rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Great communicator and reliable"
                maxLength={100}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
              />
            </div>

            {/* Content */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
                Comments (optional)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="Share details about your experience working with this caregiver…"
                maxLength={1000}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400 resize-none"
              />
              <p className="text-xs text-neutral-400 mt-1 text-right">{content.length}/1000</p>
            </div>

            {error && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-error-50 border border-error-200 rounded-lg text-sm text-error-700">
                <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting…" : "Submit Review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
