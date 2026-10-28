'use client';

import { useEffect, type RefObject } from 'react';

/**
 * OL-208 — fixed bottom bars publish their height on <body> as `--bottom-stack-offset`
 * so the floating widgets (Care Advisor bubble, Report Bug) can sit above them. The
 * widgets live in the root layout and the bars inside page shells — separate subtrees —
 * so the value goes on <body>, which both can see.
 *
 * Each bar registers under its own key (the mobile tab bar now, the OL-217 listing CTA
 * bar later); the offset is the sum. A bar that is display:none (e.g. the tab bar at
 * ≥ md) measures 0. offsetHeight includes padding, so a bar's safe-area inset padding
 * is counted. No bar mounted → the property is removed and widgets fall back to 0.
 */
const heights = new Map<string, number>();

function publish() {
  if (typeof document === 'undefined') return;
  const total = Array.from(heights.values()).reduce((sum, h) => sum + h, 0);
  if (total > 0) document.body.style.setProperty('--bottom-stack-offset', `${total}px`);
  else document.body.style.removeProperty('--bottom-stack-offset');
}

export function useBottomStackOffset(ref: RefObject<HTMLElement | null>, key: string, enabled = true) {
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    const measure = () => {
      heights.set(key, el.offsetHeight);
      publish();
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', measure);
      heights.delete(key);
      publish();
    };
  }, [ref, key, enabled]);
}
