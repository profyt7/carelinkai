/**
 * Product tour data: types, validation and chapter helpers. Pure (no Node APIs), so the client
 * carousel can import it; the file loader lives in ./product-tour.ts. Shape of public/demo/tour.json:
 *
 *   { "title": "…", "sampleDataNote": "…",
 *     "slides": [{ "image": "/demo/01.jpg", "width": 1600, "height": 1000,
 *                  "chapter": "For families", "caption": "…", "alt": "…", "seconds": 6 }] }
 *
 * The slide's alt text is its caption (the JSON "alt" is ignored).
 */

export type TourSlide = { image: string; width: number; height: number; chapter: string; caption: string; seconds: number };
export type Tour = { title: string; sampleDataNote: string | null; slides: TourSlide[] };

const CAPTION_MAX = 200;
const SECONDS = { min: 2, max: 30, fallback: 5 };

/** Chapter → the role section it links to on /help (ids in src/app/help/HelpPageClient.tsx). */
export const CHAPTER_HELP_ANCHOR: Record<string, string> = {
  'For families': 'help-family',
  'For discharge planners': 'help-discharge-planner',
  'For care homes': 'help-operator',
  'For caregivers': 'help-caregiver',
  'For providers': 'help-provider',
};

const str = (v: unknown, max = 120): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const posInt = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v > 0 && v <= 10_000 ? v : null);

/** Pure: keep only slides whose image lives under /demo/, with a size, chapter and caption. */
export function parseTour(raw: unknown): Tour | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r['slides'])) return null;
  const slides = r['slides'].flatMap((s): TourSlide[] => {
    if (!s || typeof s !== 'object') return [];
    const o = s as Record<string, unknown>;
    const image = o['image'];
    if (typeof image !== 'string' || !/^\/demo\/[\w.-]+\.(png|jpe?g|webp|avif)$/i.test(image) || image.includes('..')) return [];
    const width = posInt(o['width']);
    const height = posInt(o['height']);
    const chapter = str(o['chapter']);
    const caption = str(o['caption'], CAPTION_MAX);
    if (!width || !height || !chapter || !caption) return [];
    const sec = typeof o['seconds'] === 'number' && Number.isFinite(o['seconds']) ? o['seconds'] : SECONDS.fallback;
    return [{ image, width, height, chapter, caption, seconds: Math.min(SECONDS.max, Math.max(SECONDS.min, sec)) }];
  });
  if (!slides.length) return null;
  return { title: str(r['title']) ?? 'Product tour', sampleDataNote: str(r['sampleDataNote'], CAPTION_MAX), slides };
}

/** Chapter chips: distinct chapters in slide order, without the "Overview" bookends. */
export function tourChapters(tour: Pick<Tour, 'slides'>): string[] {
  return Array.from(new Set(tour.slides.map((s) => s.chapter))).filter((c) => c !== 'Overview');
}

export function tourSeconds(tour: Pick<Tour, 'slides'>): number {
  return tour.slides.reduce((n, s) => n + s.seconds, 0);
}
