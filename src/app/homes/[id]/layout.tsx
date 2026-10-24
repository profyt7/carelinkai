import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { PUBLIC_LISTING_SELECT, toPublicListing, type PublicListingRow } from '@/lib/directory/public-listings';
import { buildBreadcrumbJsonLd, buildListingJsonLd } from '@/lib/seo/jsonld';
import { listingBreadcrumb, listingDescription, listingTitle } from '@/lib/seo/listing-meta';
import { DEFAULT_OG_IMAGE, publicMetadata } from '@/lib/seo/page-meta';

/**
 * Server layout for /homes/[id].
 *
 * The page itself (page.tsx) is a large client component that fetches its
 * data via the browser. That's fine for the UI, but Google and AI answer
 * engines read the initial HTML — so without server-rendered metadata + JSON-LD,
 * facility pages have no SEO surface area.
 *
 * This layout sits in front of the client page:
 *   1. Fetches the home server-side (one query per page load) through the same
 *      public-listing view the directory pages use (business data only).
 *   2. Exports generateMetadata() so the page ships proper <title>, meta
 *      description, canonical URL, and OpenGraph tags in the SSR HTML.
 *   3. Emits a schema.org LocalBusiness JSON-LD script (sprint W3 item 6a):
 *      name, address, geo, telephone (claimed only), care types, verified
 *      availability + timestamp, starting price where published, ODH license,
 *      inspection summary (facts), free Medicaid-lane note.
 *   4. Renders {children} — the existing client page is untouched.
 *
 * Only ACTIVE, non-demo listings get structured data and indexable metadata.
 * DRAFT / PENDING_REVIEW / SUSPENDED / INACTIVE and demo/tutorial fixtures get
 * a minimal noindex block and NO JSON-LD.
 */

const SITE_URL = 'https://getcarelinkai.com';

type SeoRow = PublicListingRow & {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
  isDemo: boolean;
  aiGeneratedDescription?: string | null;
};

async function loadHomeForSeo(id: string): Promise<SeoRow | null> {
  try {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
      select: { ...PUBLIC_LISTING_SELECT, status: true, isDemo: true, aiGeneratedDescription: true },
    });
    return (home as unknown as SeoRow) ?? null;
  } catch {
    // If the DB is unreachable during build/render, fall back to no SEO data
    // rather than failing the route. The client page renders independently.
    return null;
  }
}

function isPublic(home: SeoRow | null): home is SeoRow {
  return !!home && home.status === 'ACTIVE' && !home.isDemo;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const home = await loadHomeForSeo(id);
  const canonical = `${SITE_URL}/homes/${id}`;

  // Unknown / non-ACTIVE / demo listings stay out of search results.
  if (!isPublic(home)) {
    return {
      title: 'Senior care home',
      description: 'Find assisted living, memory care, and senior care homes on CareLinkAI.',
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  // OL-172 (a)(b): ≤ 60-char title (the root template adds the suffix — never doubled),
  // 140–155 char description, OG + Twitter with the home's photo or the site default.
  const linkInput = { name: home.name, city: home.address?.city ?? null, state: home.address?.state ?? null, careLevels: home.careLevel ?? [] };
  const rawDescription = (home.aiGeneratedDescription?.trim() || home.description || '').trim();
  return {
    ...publicMetadata({
      path: `/homes/${id}`,
      title: listingTitle(linkInput),
      description: listingDescription(linkInput, rawDescription),
      image: home.photos?.[0]?.url || DEFAULT_OG_IMAGE,
    }),
    robots: { index: true, follow: true },
  };
}

export default async function HomeDetailLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { id } = await params;
  const home = await loadHomeForSeo(id);

  // Only ACTIVE, non-demo listings get JSON-LD.
  const jsonLd = isPublic(home)
    ? buildListingJsonLd(toPublicListing(home), {
        description: home.aiGeneratedDescription?.trim() || home.description,
      })
    : null;

  // OL-172 (c)(f): Cleveland › care hub › suburb › this home.
  const breadcrumb = isPublic(home)
    ? buildBreadcrumbJsonLd(listingBreadcrumb({ id, name: home.name, city: home.address?.city ?? null, careLevels: home.careLevel ?? [] }))
    : null;

  return (
    <>
      {breadcrumb && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />}
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
