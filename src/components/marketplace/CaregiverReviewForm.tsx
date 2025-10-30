"use client";

import React, { useState } from "react";

type Props = {
  caregiverId: string;
};

export default function CaregiverReviewForm({ caregiverId }: Props) {
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = rating >= 1 && rating <= 5 && !loading && !success;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/reviews/caregivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caregiverId, rating, title: title || undefined, content: content || undefined, isPublic }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to submit review");
      }
      setSuccess(true);
      setTitle("");
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Leave a review</h3>
      {success ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">Thank you! Your review has been submitted.</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            <label htmlFor="rating" className="text-sm font-medium text-gray-700">Rating</label>
            <select
              id="rating"
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value, 10))}
              className="sm:col-span-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white"
            >
              {[5,4,3,2,1].map(r => (
                <option key={r} value={r}>{r} {r === 1 ? "star" : "stars"}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title (optional)</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              maxLength={120}
              placeholder="Great caregiver!"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Comments (optional)</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              rows={4}
              maxLength={2000}
              placeholder="Share your experience working with this caregiver"
            />
          </div>

          <div className="flex items-center">
            <input
              id="isPublic"
              type="checkbox"
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">Make my review public</label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full sm:w-auto inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                !canSubmit
                  ? "bg-primary-300 cursor-not-allowed"
                  : "bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              }`}
            >
              {loading ? "Submitting..." : "Submit review"}
            </button>
          </div>
        </form>
      )}
      <p className="text-xs text-gray-500 mt-3">You can review caregivers you have hired or worked with.</p>
    </div>
  );
}
