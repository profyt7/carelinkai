'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { FiAlertCircle, FiHelpCircle, FiMessageCircle, FiX } from 'react-icons/fi';
import CareConcierge from '@/components/CareConcierge';
import { BugReportModal } from '@/components/bug-report/BugReportModal';

/**
 * The one floating support control, mounted once in the root layout. It replaces the two stacked
 * floating buttons (Care Advisor + Report Bug) that covered primary actions on small screens.
 *
 *  - One launcher at every width (a 48px round button), opening a small menu: Ask a Care Advisor,
 *    Report a bug. Report Bug is no longer a floating button of its own.
 *  - It never sits on a primary action: while any link, button, form field, heading, labelled
 *    region (role=region/dialog) or [data-support-avoid] element is under it, it steps aside (fades out, not clickable) and comes
 *    back when that content scrolls away. Keyboard focus always brings it back.
 *  - It still clears fixed bottom bars through --bottom-stack-offset (OL-208), carries
 *    data-floating-widget (the listing page measures it; globals.css hides it while a listing form
 *    is open on a phone), and opens the same chat panel and bug-report modal as before.
 */

/** Anything a person might be trying to read or tap under the launcher (labelled regions: e.g. an inquiry panel). */
export const SUPPORT_AVOID_SELECTOR =
  'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="tab"],[role="region"],[role="dialog"],h1,h2,h3,[data-support-avoid]';

/** True when the topmost page element at any probe point inside `rect` is something to avoid. */
export function overlapsPrimaryContent(rect: DOMRect, self: Element, doc: Document = document): boolean {
  const inset = 4;
  const points: Array<[number, number]> = [
    [rect.left + inset, rect.top + inset],
    [rect.right - inset, rect.top + inset],
    [rect.left + inset, rect.bottom - inset],
    [rect.right - inset, rect.bottom - inset],
    [(rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2],
  ];
  for (const [x, y] of points) {
    // The first element under the point that isn't the launcher itself is what it covers there.
    const under = doc.elementsFromPoint(x, y).find((el) => !self.contains(el));
    if (under && under.closest(SUPPORT_AVOID_SELECTOR)) return true;
  }
  return false;
}

export default function SupportDock() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [yielded, setYielded] = useState(false);
  const launcherRef = useRef<HTMLDivElement>(null);

  const check = useCallback(() => {
    const el = launcherRef.current;
    if (!el || menuOpen) return setYielded(false);
    setYielded(overlapsPrimaryContent(el.getBoundingClientRect(), el));
  }, [menuOpen]);

  useEffect(() => {
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; check(); }); };
    schedule();
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    // Content also moves without a scroll (late images, sticky bars sliding in, route changes).
    const timer = window.setInterval(schedule, 700);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [check]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <>
      {!chatOpen && (
        <div
          ref={launcherRef}
          data-floating-widget
          data-testid="support-dock"
          data-yielded={yielded ? 'true' : 'false'}
          className={`fixed bottom-[calc(var(--bottom-stack-offset,0px)+1rem)] right-4 z-50 md:right-6 transition-opacity duration-150 ${
            yielded ? 'pointer-events-none opacity-0 focus-within:pointer-events-auto focus-within:opacity-100' : 'opacity-100'
          }`}
        >
          {menuOpen && (
            <div role="menu" aria-label="Help and support" className="absolute bottom-14 right-0 w-56 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setChatOpen(true); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-primary-50"
              >
                <FiMessageCircle className="h-4 w-4 text-primary-600" aria-hidden="true" />
                Ask a Care Advisor
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setBugOpen(true); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-primary-50"
              >
                <FiAlertCircle className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                Report a bug
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close help menu' : 'Help and support'}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            {menuOpen ? <FiX className="h-5 w-5" aria-hidden="true" /> : <FiHelpCircle className="h-6 w-6" aria-hidden="true" />}
          </button>
        </div>
      )}
      <CareConcierge open={chatOpen} onClose={() => setChatOpen(false)} />
      <BugReportModal isOpen={bugOpen} onClose={() => setBugOpen(false)} />
    </>
  );
}
