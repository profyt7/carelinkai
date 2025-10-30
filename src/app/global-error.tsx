"use client";

import { ErrorBoundary } from "@sentry/nextjs";

export default function GlobalError({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}