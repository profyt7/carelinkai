'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { FiAlertCircle, FiHelpCircle, FiMessageCircle, FiX } from 'react-icons/fi';
import CareConcierge from '@/components/CareConcierge';
import { BugReportModal } from '@/components/bug-report/BugReportModal';
import { isSupportSlotPath } from '@/components/support/support-slot';

/**
 * The one support control, mounted once in the root layout. It replaces the two stacked floating
 * buttons (Care Advisor + Report Bug) that covered primary actions on small screens.
 *
 * One launcher opening a small menu: Ask a Care Advisor, Report a bug. Two placements:
 *
 *  - Floating (most pages): a 48px round button bottom-right. It never takes a tap meant for a
 *    primary action: while a link, button, field, heading, labelled region or [data-support-avoid]
 *    element is under it, clicks pass through at once and it fades out after a short delay; it comes
 *    back once the spot has been clear for a moment (hysteresis, no flicker). Keyboard focus always
 *    brings it back. The menu opens at the nearest spot that covers no primary action, and closes on
 *    scroll or an outside click.
 *  - Header (result-heavy pages, see support-slot.ts): the button sits in the page header and the
 *    menu opens as a strip at the bottom of the header, in flow, so nothing is ever covered.
 *
 * Checks run on load, scroll, resize and layout changes (ResizeObserver + MutationObserver),
 * throttled to one per animation frame; no polling. It still clears fixed bottom bars through
 * --bottom-stack-offset (OL-208) and carries data-floating-widget when floating (the listing page
 * measures it; globals.css hides it while a listing form is open on a phone).
 */

/** Anything a person might be trying to read or tap (labelled regions: e.g. an inquiry panel). */
export const SUPPORT_AVOID_SELECTOR =
  'a[href],button,input,select,textarea,summary,label,[role="button"],[role="link"],[role="tab"],[role="region"],[role="dialog"],h1,h2,h3,[data-support-avoid]';

/** Hide/show settle times: hiding is quick (clicks pass through immediately anyway), showing waits longer. */
export const HIDE_DELAY_MS = 120;
export const SHOW_DELAY_MS = 350;

export type Box = { left: number; right: number; top: number; bottom: number };

/**
 * True when a primary element is actually under `box`: an avoid-element whose rectangle overlaps the
 * box by more than a sliver, and that is the topmost thing (ignoring `self`) at the centre of the
 * overlap. Rect-based, so small targets (a 36px heart) can't slip between probe points.
 */
export function overlapsPrimaryContent(box: Box, self: Element, doc: Document = document): boolean {
  const els = doc.querySelectorAll(SUPPORT_AVOID_SELECTOR);
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    if (self.contains(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.bottom <= box.top || r.top >= box.bottom || r.right <= box.left || r.left >= box.right) continue;
    const left = Math.max(r.left, box.left);
    const right = Math.min(r.right, box.right);
    const top = Math.max(r.top, box.top);
    const bottom = Math.min(r.bottom, box.bottom);
    if (right - left < 2 || bottom - top < 2) continue;
    const hit = doc.elementsFromPoint((left + right) / 2, (top + bottom) / 2).find((n) => !self.contains(n));
    if (hit && (el === hit || el.contains(hit))) return true;
  }
  return false;
}

const MENU_W = 224; // w-56
const MENU_H = 104; // two items + padding
const GAP = 8;
const EDGE = 8;

/**
 * Where the floating menu goes: the clear spot nearest the launcher (above it first, then up the right
 * edge, then to its left), staying inside the viewport and below the header. Null if none is clear.
 */
export function chooseMenuSpot(launcher: Box, self: Element, view: { width: number; height: number; top: number }, doc: Document = document): { left: number; top: number } | null {
  const cands: Array<{ left: number; top: number; d: number }> = [];
  const xs = [launcher.right - MENU_W, launcher.left - GAP - MENU_W, launcher.left - GAP - 2 * MENU_W - GAP];
  for (const x0 of xs) {
    const left = Math.max(EDGE, Math.min(x0, view.width - EDGE - MENU_W));
    for (let top = launcher.top - GAP - MENU_H; top >= view.top + EDGE; top -= 24) {
      cands.push({ left, top, d: Math.hypot(launcher.right - (left + MENU_W), launcher.top - (top + MENU_H)) });
    }
    if (x0 !== xs[0]) {
      const top = Math.min(launcher.bottom - MENU_H, view.height - EDGE - MENU_H);
      cands.push({ left, top, d: Math.hypot(launcher.left - (left + MENU_W), 0) });
    }
  }
  cands.sort((a, b) => a.d - b.d);
  for (const c of cands) {
    if (!overlapsPrimaryContent({ left: c.left, right: c.left + MENU_W, top: c.top, bottom: c.top + MENU_H }, self, doc)) return { left: c.left, top: c.top };
  }
  return null;
}

export default function SupportDock() {
  const pathname = usePathname();
  const headerMode = isSupportSlotPath(pathname);
  const [slot, setSlot] = useState<{ button: Element; panel: Element } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [spot, setSpot] = useState<{ left: number; top: number } | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  // `blocked`: something primary is under the launcher right now (clicks pass through immediately).
  // `yielded`: the settled visual state (fades only after the condition has held for a moment).
  const [blocked, setBlocked] = useState(false);
  const [yielded, setYielded] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const settleTimer = useRef<number | undefined>(undefined);
  const openedByKeyboard = useRef(false);
  const floating = !headerMode || !slot;

  const findSlot = useCallback(() => {
    if (!headerMode) { setSlot((s) => (s ? null : s)); return; }
    const button = Array.from(document.querySelectorAll('[data-support-slot]')).find((n) => (n as HTMLElement).offsetParent !== null) ?? null;
    const panel = document.querySelector('[data-support-slot-panel]');
    setSlot((s) => (button && panel ? (s?.button === button && s?.panel === panel ? s : { button, panel }) : null));
  }, [headerMode]);

  const check = useCallback(() => {
    findSlot();
    const el = buttonRef.current;
    const dock = dockRef.current;
    if (!floating || !el || !dock || menuOpen) { setBlocked(false); return; }
    setBlocked(overlapsPrimaryContent(el.getBoundingClientRect(), dock));
  }, [findSlot, floating, menuOpen]);

  // Settle the visual state with hysteresis.
  useEffect(() => {
    window.clearTimeout(settleTimer.current);
    if (blocked === yielded) return;
    settleTimer.current = window.setTimeout(() => setYielded(blocked), blocked ? HIDE_DELAY_MS : SHOW_DELAY_MS);
    return () => window.clearTimeout(settleTimer.current);
  }, [blocked, yielded]);

  useEffect(() => {
    let raf = 0;
    const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; check(); }); };
    schedule();
    window.addEventListener('load', schedule, { once: true });
    document.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    // Content also moves without a scroll (late images, sticky bars sliding in, results arriving, route changes).
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(document.body);
    const mo = typeof MutationObserver !== 'undefined'
      ? new MutationObserver((records) => {
          if (records.every((r) => dockRef.current?.contains(r.target))) return; // our own re-renders
          schedule();
        })
      : null;
    mo?.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo?.disconnect();
      window.removeEventListener('load', schedule);
      document.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
    };
  }, [check]);

  // A route change closes the menu (and re-resolves the placement).
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const closeMenu = useCallback((returnFocus: boolean) => {
    setMenuOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  const openMenu = useCallback((viaKeyboard: boolean) => {
    const el = buttonRef.current;
    const dock = dockRef.current;
    if (floating && el && dock) {
      const header = document.querySelector('[data-testid="site-header"], header');
      const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      setSpot(chooseMenuSpot(el.getBoundingClientRect(), dock, { width: window.innerWidth, height: window.innerHeight, top }));
    }
    openedByKeyboard.current = viaKeyboard;
    setMenuOpen(true);
  }, [floating]);

  // Keyboard-opened menus move focus to the first item.
  useEffect(() => {
    if (menuOpen && openedByKeyboard.current) itemRefs.current[0]?.focus();
  }, [menuOpen]);

  // Escape closes (focus back to the launcher); an outside click or (floating) a page scroll closes.
  useEffect(() => {
    if (!menuOpen) return;
    const inside = (t: EventTarget | null) => Boolean(t instanceof Node && (dockRef.current?.contains(t) || menuRef.current?.contains(t)));
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); } };
    const onDown = (e: PointerEvent) => { if (!inside(e.target)) closeMenu(false); };
    // Close on a real scroll (> 40px since opening), not on a scroll that was already settling.
    const scrollY = () => { const m = document.querySelector('main'); return window.scrollY + (m ? m.scrollTop : 0); };
    const y0 = scrollY();
    const onScroll = (e: Event) => { if (floating && !inside(e.target) && Math.abs(scrollY() - y0) > 40) closeMenu(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [menuOpen, closeMenu, floating]);

  const menuRef = useRef<HTMLDivElement>(null);

  const onMenuKey = (e: React.KeyboardEvent) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    const forward = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    if (forward || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      items[forward ? (i + 1) % items.length : (i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      items[e.key === 'Home' ? 0 : items.length - 1]?.focus();
    } else if (e.key === 'Tab' && ((!e.shiftKey && i === items.length - 1) || (e.shiftKey && i === 0))) {
      // Tab past either end leaves the menu: close it and land on the launcher.
      e.preventDefault();
      closeMenu(true);
    }
  };

  const items = (
    <>
      <button
        ref={(n) => { itemRefs.current[0] = n; }}
        type="button"
        role="menuitem"
        onClick={() => { setMenuOpen(false); setChatOpen(true); }}
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
      >
        <FiMessageCircle className="h-4 w-4 text-primary-600" aria-hidden="true" />
        Ask a Care Advisor
      </button>
      <button
        ref={(n) => { itemRefs.current[1] = n; }}
        type="button"
        role="menuitem"
        onClick={() => { setMenuOpen(false); setBugOpen(true); }}
        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-800 hover:bg-primary-50 focus:bg-primary-50 focus:outline-none"
      >
        <FiAlertCircle className="h-4 w-4 text-neutral-500" aria-hidden="true" />
        Report a bug
      </button>
    </>
  );

  const launcher = (cls: string) => (
    <button
      ref={buttonRef}
      type="button"
      onClick={(e) => (menuOpen ? closeMenu(false) : openMenu(e.detail === 0))}
      aria-label="Help and support"
      aria-haspopup="menu"
      aria-expanded={menuOpen}
      data-testid="support-launcher"
      className={cls}
    >
      {menuOpen ? <FiX className="h-5 w-5" aria-hidden="true" /> : <FiHelpCircle className="h-6 w-6" aria-hidden="true" />}
    </button>
  );

  const hidden = floating && yielded && !menuOpen;
  const passThrough = floating && (blocked || yielded) && !menuOpen;

  return (
    <>
      {!chatOpen && floating && (
        <div
          ref={dockRef}
          data-floating-widget
          data-testid="support-dock"
          data-mode="floating"
          data-yielded={hidden ? 'true' : 'false'}
          data-blocked={passThrough ? 'true' : 'false'}
          className={`fixed bottom-[calc(var(--bottom-stack-offset,0px)+1rem)] right-4 z-50 md:right-6 transition-opacity duration-150 ${
            passThrough ? 'pointer-events-none focus-within:pointer-events-auto' : ''
          } ${hidden ? 'opacity-0 focus-within:opacity-100' : 'opacity-100'}`}
        >
          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              aria-label="Help and support"
              data-testid="support-menu"
              data-placement={spot ? 'clear-spot' : 'above'}
              onKeyDown={onMenuKey}
              style={spot ? { position: 'fixed', left: spot.left, top: spot.top } : undefined}
              className={`flex w-56 flex-col rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl ${spot ? '' : 'absolute bottom-14 right-0'}`}
            >
              {items}
            </div>
          )}
          {launcher('flex h-12 w-12 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-colors hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2')}
        </div>
      )}
      {!chatOpen && !floating && slot && (
        <>
          {createPortal(
            <div ref={dockRef} data-testid="support-dock" data-mode="header" data-yielded="false" data-blocked="false" className="flex items-center">
              {launcher('flex h-11 w-11 items-center justify-center rounded-full text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500')}
            </div>,
            slot.button,
          )}
          {menuOpen && createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label="Help and support"
              data-testid="support-menu"
              data-placement="header-strip"
              onKeyDown={onMenuKey}
              className="flex flex-wrap items-center justify-end gap-1 border-t border-neutral-200 bg-white px-4 py-1.5 md:px-6"
            >
              {items}
            </div>,
            slot.panel,
          )}
        </>
      )}
      <CareConcierge open={chatOpen} onClose={() => setChatOpen(false)} />
      <BugReportModal isOpen={bugOpen} onClose={() => setBugOpen(false)} />
    </>
  );
}
