/**
 * Homepage product tour (demo section). Slides live in /public/demo/: 16:10
 * images plus /public/demo/tour.json:
 *
 *   { "slides": [{ "src": "/demo/01-search.png", "caption": "…", "alt": "…" }] }
 *
 * No file, unreadable JSON or no valid slide → null, and the tour renders
 * nothing. Server-only (reads the filesystem).
 */

import fs from 'node:fs';
import path from 'node:path';

export type TourSlide = { src: string; caption: string; alt: string };

export const TOUR_JSON_PATH = path.join('public', 'demo', 'tour.json');
const CAPTION_MAX = 200;

/** Pure: keep only slides whose image lives under /demo/ and that have a caption. */
export function parseTour(raw: unknown): TourSlide[] | null {
  const list = raw && typeof raw === 'object' ? (raw as { slides?: unknown }).slides : null;
  if (!Array.isArray(list)) return null;
  const slides = list.flatMap((s): TourSlide[] => {
    if (!s || typeof s !== 'object') return [];
    const { src, caption, alt } = s as Record<string, unknown>;
    if (typeof src !== 'string' || !/^\/demo\/[\w./-]+\.(png|jpe?g|webp|avif)$/i.test(src) || src.includes('..')) return [];
    if (typeof caption !== 'string' || !caption.trim()) return [];
    const c = caption.trim().slice(0, CAPTION_MAX);
    return [{ src, caption: c, alt: typeof alt === 'string' && alt.trim() ? alt.trim() : c }];
  });
  return slides.length ? slides : null;
}

export function loadProductTour(cwd: string = process.cwd()): TourSlide[] | null {
  try {
    return parseTour(JSON.parse(fs.readFileSync(path.join(cwd, TOUR_JSON_PATH), 'utf8')));
  } catch {
    return null;
  }
}
