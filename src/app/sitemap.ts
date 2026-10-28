import type { MetadataRoute } from 'next';
import { GUIDES } from '@/app/learn/guides/content';
import { SUBURBS, suburbPath } from '@/lib/directory/suburbs';

const SITE_URL = 'https://getcarelinkai.com';

// OL-159: re-rendered at least hourly and on demand (POST /api/admin/revalidate).
export const revalidate = 3600;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/cleveland`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/cleveland/assisted-living`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/cleveland/memory-care`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/cleveland/independent-living`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/cleveland/nursing-homes`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // Home-care agency cohort landing (sprint W3 item 2 / sprint 1.6, 2.2).
    {
      url: `${SITE_URL}/cleveland/home-care-agencies`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    // Family concierge offer (sprint W3 item 5 / sprint 3.1).
    {
      url: `${SITE_URL}/concierge`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Education Hub landing — the SEO entry point for the Senior Care Guides.
    {
      url: `${SITE_URL}/learn`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Suburb assisted-living pages (sprint W3 item 3) — allow-listed in
  // src/lib/directory/suburbs.ts; adding a suburb there adds it here.
  const suburbPages: MetadataRoute.Sitemap = SUBURBS.map((s) => ({
    url: `${SITE_URL}${suburbPath(s)}`,
    lastModified,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // The 15 Senior Care Guides — the bulk of the organic-search surface.
  const guidePages: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE_URL}/learn/guides/${g.slug}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...suburbPages, ...guidePages];
}
