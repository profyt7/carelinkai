"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for observability; avoid crashing the render tree
    // eslint-disable-next-line no-console
    console.error("App Error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-500">
        An unexpected error occurred. Please try again.
      </p>
      <div className="mt-4 flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded bg-primary text-white"
        >
          Try again
        </button>
        <a href="/" className="px-4 py-2 rounded border">
          Go home
        </a>
      </div>
    </div>
  );
}
