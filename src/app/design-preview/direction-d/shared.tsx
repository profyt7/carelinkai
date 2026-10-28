'use client';

import { useState, type ReactNode } from 'react';
import { FiMenu, FiPhone } from 'react-icons/fi';

/** Direction A's ivory — page background + hero tint ONLY, never a card surface. */
export const IVORY_PAGE = 'bg-surface-ivory';
export const IVORY_HERO = 'bg-gradient-to-b from-surface-ivory-deep to-surface-ivory';

export type Mode = 'desktop' | 'tablet' | 'mobile';
export type Viewer = 'guest' | 'family';
export const WIDTH: Record<Mode, number> = { desktop: 1280, tablet: 820, mobile: 390 };
const MODE_LABEL: Record<Mode, string> = { desktop: 'Desktop 1280', tablet: 'Tablet 820', mobile: 'Mobile 390' };

/** Primary / secondary / quiet controls — one radius (rounded-lg), visible focus, hover/active/disabled. */
export const BTN_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 active:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-safe:transition-colors';
export const BTN_SECONDARY =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-surface-raised px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-safe:transition-colors';
export const LINK =
  'rounded-sm font-medium text-primary-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

/**
 * One previewed screen inside a fixed-width, horizontally scrollable frame with
 * a Desktop / Tablet / Mobile toggle (no iframes). The child gets the mode so it
 * can lay out for that width — Tailwind breakpoints follow the real viewport,
 * which a frame can't change.
 */
export function PreviewFrame({
  id,
  title,
  description,
  viewportHeight,
  viewerToggle = false,
  children,
}: {
  id: string;
  title: string;
  description: string;
  /** Fixed device height per mode (the frame scrolls inside, so sticky bars behave as on a phone). */
  viewportHeight?: Partial<Record<Mode, number>>;
  /** Adds a Guest / Signed-in toggle (logged-out = top nav, logged-in = sidebar). */
  viewerToggle?: boolean;
  children: (mode: Mode, viewer: Viewer) => ReactNode;
}) {
  const [mode, setMode] = useState<Mode>('desktop');
  const [viewer, setViewer] = useState<Viewer>('guest');
  const height = viewportHeight?.[mode];
  return (
    <section aria-labelledby={`${id}-title`} data-testid={`d-preview-${id}`} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 id={`${id}-title`} className="text-lg font-semibold text-neutral-900">{title}</h3>
          <p className="text-sm text-neutral-600">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
        {viewerToggle && (
          <div className="inline-flex rounded-lg border border-neutral-300 bg-surface-raised p-0.5" role="group" aria-label={`${title} viewer`}>
            {(['guest', 'family'] as Viewer[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewer(v)}
                aria-pressed={viewer === v}
                data-viewer={v}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-safe:transition-colors ${
                  viewer === v ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {v === 'guest' ? 'Guest' : 'Signed in'}
              </button>
            ))}
          </div>
        )}
        <div className="inline-flex rounded-lg border border-neutral-300 bg-surface-raised p-0.5" role="group" aria-label={`${title} preview width`}>
          {(Object.keys(WIDTH) as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              data-mode={m}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-safe:transition-colors ${
                mode === m ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
              }`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-neutral-100 p-3">
        <div
          className={`mx-auto rounded-lg bg-surface-raised shadow-card ${height ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}`}
          style={{ width: WIDTH[mode], height }}
          data-testid={`d-frame-${id}`}
          data-frame-mode={mode}
          data-frame-viewer={viewer}
        >
          {children(mode, viewer)}
        </div>
      </div>
    </section>
  );
}

/** Preview-only caption naming the data state a card demonstrates. */
export function StateCaption({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 min-h-[2rem] px-1 text-xs text-neutral-600">Preview state: {children}</p>;
}

/** Logged-out family top nav (PublicShell pattern) — top nav only, never with a sidebar. */
export function PublicTopNav({ mode, label }: { mode: Mode; label: string }) {
  const mobile = mode === 'mobile';
  return (
    <header className="border-b border-line bg-surface-raised">
      <div className="flex h-16 items-center justify-between px-6">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-sm font-bold text-white" aria-hidden="true">C</span>
          <span className="text-base font-semibold text-neutral-900">CareLinkAI</span>
        </span>
        {mobile ? (
          <button type="button" aria-label="Open menu" className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            <FiMenu className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <>
            <nav aria-label={label} className="flex items-center gap-6 text-sm font-medium text-neutral-700">
              {['Find care', 'Cleveland', 'Family Concierge', 'For care homes'].map((l) => (
                <a key={l} href="#" onClick={(e) => e.preventDefault()} className="rounded-sm hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  {l}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-4">
              {mode === 'desktop' && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-primary-700">
                  <FiPhone className="h-4 w-4" aria-hidden="true" /> (216) 245-9482
                </span>
              )}
              <button type="button" className={BTN_SECONDARY}>Log in</button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
