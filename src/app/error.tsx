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
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    console.error("Error Stack:", error.stack);
    if (error.digest) {
      console.error("Error Digest:", error.digest);
    }
  }, [error]);

  const isDev = process.env.NODE_ENV === 'development';

  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-500">
        An unexpected error occurred. Please try again.
      </p>
      {isDev && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-left text-xs">
          <p className="font-mono text-red-600 break-all">
            <strong>Error:</strong> {error.message}
          </p>
          {error.stack && (
            <pre className="mt-2 text-red-500 overflow-auto max-h-32 whitespace-pre-wrap">
              {error.stack}
            </pre>
          )}
        </div>
      )}
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400">
          Error ID: {error.digest}
        </p>
      )}
      <div className="mt-4 flex gap-3 justify-center">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
        >
          Try again
        </button>
        <a href="/" className="px-4 py-2 rounded border hover:bg-gray-50">
          Go home
        </a>
      </div>
    </div>
  );
}
