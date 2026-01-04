"use client";

import ErrorBoundary from "@/components/ErrorBoundary";

export default function GlobalError({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}