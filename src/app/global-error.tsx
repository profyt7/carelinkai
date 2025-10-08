"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // eslint-disable-next-line no-console
  console.error("Global Error:", error);
  return (
    <html>
      <body>
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
      </body>
    </html>
  );
}
