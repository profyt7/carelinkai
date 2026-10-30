"use client";

/**
 * Product tour carousel (homepage demo section, /help "Start here"). Slide image + caption, chapter
 * chips, Back / Play / Next, arrow keys when focused, swipe on touch. Autoplay is off; Play advances
 * by each slide's `seconds` and stops on the last slide. Under prefers-reduced-motion the slide
 * change doesn't animate (Play still works: the viewer starts it). Renders nothing without a tour
 * (see src/lib/marketing/product-tour.ts).
 */

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { FiChevronLeft, FiChevronRight, FiPause, FiPlay } from "react-icons/fi";
import { tourChapters, type Tour } from "@/lib/marketing/product-tour-data";

const SWIPE_PX = 40;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

type Props = {
  tour?: Tour | null;
  /** /help: chips link to that chapter's help section instead of jumping to its first slide. */
  chapterHref?: (chapter: string) => string | undefined;
};

export default function ProductTour({ tour, chapterHref }: Props) {
  const slides = tour?.slides ?? [];
  const n = slides.length;
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const touchX = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const go = useCallback((d: number) => setI((cur) => (n ? (cur + d + n) % n : 0)), [n]);

  // Play: advance after this slide's seconds; stop on the last slide.
  const slide = slides[i];
  useEffect(() => {
    if (!playing || !slide) return;
    if (i >= n - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setI((cur) => Math.min(cur + 1, n - 1)), slide.seconds * 1000);
    return () => clearTimeout(t);
  }, [playing, i, n, slide]);

  if (!tour || !slide) return null;

  const chapters = tourChapters(tour);
  const firstOf = (c: string) => slides.findIndex((s) => s.chapter === c);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
  };
  const onTouchStart = (e: TouchEvent) => { touchX.current = e.touches[0]?.clientX ?? null; };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchX.current;
    touchX.current = null;
    const end = e.changedTouches[0]?.clientX;
    if (start == null || end == null || Math.abs(end - start) < SWIPE_PX) return;
    go(end < start ? 1 : -1);
  };
  const togglePlay = () => {
    // Play from the end starts over.
    if (!playing && i >= n - 1) setI(0);
    setPlaying((p) => !p);
  };

  const chip = "rounded-full border px-3 py-1 text-xs font-medium transition-colors";
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={tour.title}
      tabIndex={0}
      onKeyDown={onKey}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      data-testid="product-tour"
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      {chapters.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pt-4" data-testid="product-tour-chapters">
          {chapters.map((c) => {
            const active = slide.chapter === c;
            const cls = `${chip} ${active ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"}`;
            const href = chapterHref?.(c);
            return href ? (
              <Link key={c} href={href} className={cls}>{c}</Link>
            ) : (
              <button key={c} type="button" aria-pressed={active} onClick={() => { setPlaying(false); setI(firstOf(c)); }} className={cls}>{c}</button>
            );
          })}
        </div>
      )}

      <div className="relative mt-4 aspect-[16/10] bg-neutral-100">
        <Image
          key={slide.image}
          src={slide.image}
          width={slide.width}
          height={slide.height}
          alt={slide.caption}
          sizes="(min-width: 1024px) 480px, 100vw"
          priority={i === 0}
          className={`absolute inset-0 h-full w-full object-contain ${reducedMotion ? "" : "motion-safe:animate-fade-in"}`}
          data-testid="product-tour-image"
        />
      </div>

      <div className="px-4 pt-3">
        <p className="text-sm text-neutral-800 min-h-[2.5rem]" aria-live={playing ? "off" : "polite"} data-testid="product-tour-caption">{slide.caption}</p>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => go(-1)} className={btn} aria-label="Back">
            <FiChevronLeft aria-hidden /> Back
          </button>
          <button type="button" onClick={togglePlay} className={btn} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing} data-testid="product-tour-play">
            {playing ? <FiPause aria-hidden /> : <FiPlay aria-hidden />} {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={() => go(1)} className={btn} aria-label="Next">
            Next <FiChevronRight aria-hidden />
          </button>
        </div>
        <span className="text-xs text-neutral-500 tabular-nums" data-testid="product-tour-position">{i + 1} / {n}</span>
      </div>

      {tour.sampleDataNote && (
        <p className="border-t border-neutral-100 px-4 py-2 text-xs text-neutral-500" data-testid="product-tour-note">{tour.sampleDataNote}</p>
      )}
    </section>
  );
}
