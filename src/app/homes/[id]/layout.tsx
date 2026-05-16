import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { buildHomeJsonLd, type HomeForJsonLd } from '@/lib/seo/homeJsonLd';

/**
 * Server layout for /homes/[id].
 *
 * The page itself (page.tsx) is a large client component that fetches its
 * data via the browser. That's fine for the UI, but Google indexes the
 * initial HTML — so without server-rendered metadata + JSON-LD, facility
 * pages have no SEO surface area.
 *
 * This layout sits in front of the client page:
 *   1. Fetches the home server-side (one query per page load).
 *   2. Exports generateMetadata() so the page ships proper <title>, meta
 *      description, canonical URL, and OpenGraph tags in the SSR HTML.
 *   3. Emits a LodgingBusiness JSON-LD script in the SSR HTML.
 *   4. Renders {children} — the existing client page is untouched.
 *
 * Only ACTIVE listings get structured data and indexable metadata. DRAFT,
 * PENDING_REVIEW, SUSPENDED, and INACTIVE listings get a minimal noindex
 * metadata block — they shouldn't show up in search results until claimed
 * and approved.
 */

const SITE_URL = 'https://getcarelinkai.com';

type HomeRecord = HomeForJsonLd & {
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';
};

async function loadHomeForSeo(id: string): Promise<HomeRecord | null> {
  try {
    const home = await prisma.assistedLivingHome.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        aiGeneratedDescription: true,
        status: true,
        careLevel: true,
        amenities: true,
        capacity: true,
        priceMin: true,
        priceMax: true,
        address: {
          select: {
            street: true,
            street2: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            latitude: true,
            longitude: true,
          },
        },
        photos: {
          select: {
            url: true,
            caption: true,
            isPrimary: true,
            sortOrder: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 8,
        },
      },
    });
    if (!home) return null;

    // Coerce Prisma Decimal columns to numbers for the JSON-LD builder.
    const priceMin = home.priceMin == null ? null : Number(home.priceMin);
    const priceMax = home.priceMax == null ? null : Number(home.priceMax);

    return {
      ...home,
      priceMin,
      priceMax,
    } as HomeRecord;
  } catch {
    // If the DB is unreachable during build/render, fall back to no SEO data
    // rather than failing the route. The client page renders independently.
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const home = await loadHomeForSeo(id);
  const canonical = `${SITE_URL}/homes/${id}`;

  // Unknown / non-ACTIVE listings stay out of search results.
  if (!home || home.status !== 'ACTIVE') {
    return {
      title: 'Senior care home | CareLinkAI',
      description: 'Find assisted living, memory care, and senior care homes on CareLinkAI.',
      alternates: { canonical },
      robots: { index: false, follow: true },
    };
  }

  const locality = home.address ? `${home.address.city}, ${home.address.state}` : '';
  const title = locality
    ? `${home.name} — Senior Care in ${locality} | CareLinkAI`
    : `${home.name} | CareLinkAI`;

  const rawDescription = home.aiGeneratedDescription?.trim() || home.description;
  const description = rawDescription.length > 160 ? `${rawDescription.slice(0, 157)}…` : rawDescription;

  const ogImage = home.photos?.find((p) => p.isPrimary)?.url ?? home.photos?.[0]?.url;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      siteName: 'CareLinkAI',
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
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

  // Only emit JSON-LD for ACTIVE listings. DRAFT/PENDING/SUSPENDED/INACTIVE
  // shouldn't appear in Google rich results.
  const shouldEmitJsonLd = home && home.status === 'ACTIVE';
  const jsonLd = shouldEmitJsonLd ? buildHomeJsonLd(home) : null;

  return (
    <>
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
