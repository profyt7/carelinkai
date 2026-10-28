"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App Error:", error);
    Sentry.captureException(error, {
      tags: { location: "error-boundary", digest: error.digest || "unknown" },
      extra: { componentStack: error.stack },
    });
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-error-50">
          <svg className="h-8 w-8 text-error-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold text-neutral-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-neutral-500">
          An unexpected error occurred. Please try again or go back home.
        </p>

        {isDev && (
          <div className="mt-4 rounded-lg border border-error-200 bg-error-50 p-4 text-left text-xs">
            <p className="font-mono font-medium text-error-700 break-all">
              {error.message}
            </p>
            {error.stack && (
              <pre className="mt-2 text-error-600 overflow-auto max-h-32 whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        )}

        {error.digest && (
          <p className="mt-3 text-xs text-neutral-400">
            Error ID: <span className="font-mono">{error.digest}</span>
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
