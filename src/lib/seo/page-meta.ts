/**
 * OL-172 (a)(b) — one place that builds the metadata for the public pages.
 *
 * The root layout sets `title.template = "%s | CareLinkAI"`, so page titles
 * here NEVER carry the suffix themselves (that is how "| CareLinkAI |
 * CareLinkAI" got onto every hub page). Rules, pinned by
 * __tests__/seo-page-meta.unit.test.ts:
 *   - rendered title (base + suffix) ≤ 60 characters, suffix exactly once;
 *   - meta description 140–155 characters;
 *   - og:title / og:description / og:url / og:site_name and twitter:card on
 *     every public page. og:image comes from the opengraph-image route of each
 *     page type (hub, care type, suburb, concierge); listing pages use the
 *     home's first photo or the site default.
 */

import type { Metadata } from 'next';

export const SITE_URL = 'https://getcarelinkai.com';
export const SITE_NAME = 'CareLinkAI';
export const TITLE_SUFFIX = ` | ${SITE_NAME}`;
export const TITLE_MAX = 60;
export const DESCRIPTION_MIN = 140;
export const DESCRIPTION_MAX = 155;
/** The site-wide fallback image (also the root layout's og:image). */
export const DEFAULT_OG_IMAGE = '/images/og-image.jpg';

export type PageMetaInput = {
  /** Path only, e.g. "/cleveland/memory-care". */
  path: string;
  /** Title WITHOUT the " | CareLinkAI" suffix (the root template adds it). */
  title: string;
  description: string;
  /** Explicit og:image (listing photo). Omit to let the route's opengraph-image file supply it. */
  image?: string | null;
  index?: boolean;
};

/** The <title> a page will render once the root template is applied. */
export function renderedTitle(base: string): string {
  return base.endsWith(TITLE_SUFFIX) ? base : `${base}${TITLE_SUFFIX}`;
}

export function publicMetadata(m: PageMetaInput): Metadata {
  const url = `${SITE_URL}${m.path}`;
  const full = renderedTitle(m.title);
  const images = m.image ? [{ url: m.image }] : undefined;
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: url },
    openGraph: {
      title: full,
      description: m.description,
      type: 'website',
      url,
      siteName: SITE_NAME,
      locale: 'en_US',
      ...(images ? { images } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: full,
      description: m.description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
    ...(m.index === false ? { robots: { index: false, follow: true } } : {}),
  };
}

/** Trim a sentence to ≤ max characters on a word boundary, ending with "…" when cut. */
export function clampText(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const at = cut.lastIndexOf(' ');
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s,;:.—–-]+$/, '')}…`;
}

/**
 * Static public pages (the dynamic ones — suburb pages, listings — build theirs
 * from data: src/lib/directory/suburbs.ts and src/app/homes/[id]/layout.tsx).
 */
export const PAGE_META = {
  cleveland: {
    path: '/cleveland',
    title: 'Senior Care in Cleveland, OH: Licensed Homes',
    description:
      'Find assisted living, memory care and nursing homes across Greater Cleveland: licensed homes, Ohio inspection facts, and open beds labeled verified or not.',
  },
  assistedLiving: {
    path: '/cleveland/assisted-living',
    title: 'Assisted Living in Cleveland, OH',
    description:
      'Licensed assisted living homes across Greater Cleveland with Ohio Department of Health inspection facts, waiver status and beds labeled verified or not.',
  },
  memoryCare: {
    path: '/cleveland/memory-care',
    title: 'Memory Care in Cleveland, OH: Licensed Homes',
    description:
      'Licensed memory care homes in Greater Cleveland for Alzheimer’s and dementia, with Ohio inspection facts, waiver status and beds labeled verified or not.',
  },
  independentLiving: {
    path: '/cleveland/independent-living',
    title: 'Independent Living in Cleveland, OH',
    description:
      'Independent living in Greater Cleveland, plus the licensed homes in our directory that offer it, with Ohio inspection facts and labeled availability.',
  },
  nursingHomes: {
    path: '/cleveland/nursing-homes',
    title: 'Nursing Homes in Cleveland, OH',
    description:
      'How Cleveland nursing homes differ from assisted living, how Medicare and Medicaid pay, and the licensed homes in our directory that fit the care level.',
  },
  homeCareAgencies: {
    path: '/cleveland/home-care-agencies',
    title: 'Home Care Agencies in Cleveland, OH',
    description:
      // A guide, not listings: there are no home care agency listings yet (OL-257).
      'A guide to home care in Greater Cleveland: in-home aides, Ohio’s PASSPORT waiver and choosing an agency. Home care agencies: list your agency free.',
  },
  concierge: {
    path: '/concierge',
    title: 'Family Concierge: Pay When Ready',
    description:
      'A Cleveland person checks fit, prices and the contract. Research first; pay only when your shortlist is ready. Free if Medicaid, Medicare or the VA pays.',
  },
  search: {
    path: '/search',
    title: 'Search Senior Care Homes in Greater Cleveland',
    description:
      'Search licensed assisted living, memory care and senior care homes in Greater Cleveland by city, care level and Medicaid waiver status. Free for families.',
  },
} as const satisfies Record<string, PageMetaInput>;
