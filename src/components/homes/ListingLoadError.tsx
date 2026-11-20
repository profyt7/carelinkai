"use client";

/**
 * Shown when the public listing could not be loaded after automatic retries: a plain explanation and a
 * "Try again" button (no permanent dead end). `notFound` is a final answer, so it gets no retry button.
 */
export default function ListingLoadError({ notFound = false, onRetry }: { notFound?: boolean; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6" role="alert" data-testid="listing-load-error">
      <h2 className="mb-2 text-lg font-semibold text-neutral-900">
        {notFound ? "We couldn’t find this listing" : "We couldn’t load this listing"}
      </h2>
      <p className="text-neutral-700">
        {notFound
          ? "It may have been removed or merged with another listing."
          : "This is usually a brief connection problem. Please try again."}
      </p>
      {!notFound && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
          data-testid="listing-load-retry"
        >
          Try again
        </button>
      )}
    </div>
  );
}
