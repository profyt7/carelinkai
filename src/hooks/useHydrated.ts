"use client";

import { useEffect, useState } from "react";

/**
 * False on the server and in the first client render, true once React has hydrated this component.
 * For buttons whose action is only an onClick handler: render them `disabled` until hydrated, so a tap
 * on the server-rendered HTML (before the handler is attached) can't silently do nothing.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
