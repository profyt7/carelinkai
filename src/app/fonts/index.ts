/**
 * Site fonts, served from this repo (next/font/local).
 *
 * Replaces the next/font/google calls that lived in layout.tsx. Those fetched
 * the CSS + woff2 from Google at BUILD time, and a cache-miss build on Render /
 * CI occasionally got a garbage response and died with
 * `TypeError: Cannot read properties of null (reading '1')` in
 * @next/font/google/loader.js (OL-146). With the files committed here no build
 * ever reaches the network for fonts.
 *
 * Same families, same weights, same subset (latin), same CSS variable names
 * (`--font-inter`, `--font-dm-serif`) and `display: swap`, so tailwind.config.js
 * and globals.css need no change. The woff2 files are the latin subsets from
 * the Fontsource packages (@fontsource/inter 5.3.0, @fontsource/dm-serif-display
 * 5.3.0), both SIL Open Font License 1.1 — see the LICENSE-*.txt files beside
 * them.
 */
import localFont from 'next/font/local';

// Inter — primary UI font (body, labels, buttons, nav, headings)
export const inter = localFont({
  src: [
    { path: './inter-latin-300-normal.woff2', weight: '300', style: 'normal' },
    { path: './inter-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './inter-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: './inter-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: './inter-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-inter',
  // Same metric-adjusted fallback next/font/google generated for a sans family.
  adjustFontFallback: 'Arial',
});

// DM Serif Display — emotional accent font for hero moments and family-facing copy
export const dmSerif = localFont({
  src: [{ path: './dm-serif-display-latin-400-normal.woff2', weight: '400', style: 'normal' }],
  display: 'swap',
  variable: '--font-dm-serif',
  // Same metric-adjusted fallback next/font/google generated for a serif family.
  adjustFontFallback: 'Times New Roman',
});
