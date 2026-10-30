"use client";

/**
 * Homepage product tour: a slide carousel (16:10 image + caption). Arrow keys
 * when focused, swipe on touch, prev / next buttons and dots. Renders nothing
 * without slides (see src/lib/marketing/product-tour.ts).
 */

import { useRef, useState, type KeyboardEvent, type TouchEvent } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import type { TourSlide } from "@/lib/marketing/product-tour";

const SWIPE_PX = 40;

export default function ProductTour({ slides }: { slides?: TourSlide[] | null }) {
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  if (!slides || slides.length === 0) return null;

  const n = slides.length;
  const go = (d: number) => setI((cur) => (cur + d + n) % n);
  const slide = slides[i]!;

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

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Product tour"
      tabIndex={0}
      onKeyDown={onKey}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="rounded-xl border border-neutral-200 bg-white shadow-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      data-testid="product-tour"
    >
      <div className="relative aspect-[16/10] bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- static files under /public/demo, sized by the 16:10 frame */}
        <img src={slide.src} alt={slide.alt} className="absolute inset-0 h-full w-full object-cover" data-testid="product-tour-image" />
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous slide" className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow flex items-center justify-center text-neutral-800 hover:bg-white">
              <FiChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next slide" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 shadow flex items-center justify-center text-neutral-800 hover:bg-white">
              <FiChevronRight size={20} />
            </button>
          </>
        )}
      </div>
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-700" aria-live="polite" data-testid="product-tour-caption">{slide.caption}</p>
        {n > 1 && (
          <div className="flex gap-1.5 flex-shrink-0">
            {slides.map((s, k) => (
              <button
                key={s.src + k}
                type="button"
                onClick={() => setI(k)}
                aria-label={`Slide ${k + 1} of ${n}`}
                aria-current={k === i}
                className={`h-2 w-2 rounded-full ${k === i ? "bg-primary-600" : "bg-neutral-300"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
