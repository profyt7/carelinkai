import type { MetadataRoute } from 'next';
import { GUIDES } from '@/app/learn/guides/content';

const SITE_URL = 'https://getcarelinkai.com';

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
    {
      url: `${SITE_URL}/search`,
      lastModified,
      changeFrequency: 'daily',
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

  // The 15 Senior Care Guides — the bulk of the organic-search surface.
  const guidePages: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE_URL}/learn/guides/${g.slug}`,
    lastModified,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  return [...staticPages, ...guidePages];
}
