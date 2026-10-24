import type { MetadataRoute } from 'next';

const SITE_URL = 'https://getcarelinkai.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // /llms.txt listed explicitly: the plain-text overview for AI agents
        // (sprint W3 item 6c) must be discoverable from robots.txt.
        allow: ['/', '/llms.txt'],
        disallow: [
          '/admin/',
          '/api/',
          '/operator/',
          '/family/',
          '/dashboard/',
          '/auth/',
          '/login',
          '/signup',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // OL-171: no `Host:` line — a Yandex-only directive that Lighthouse flags as invalid.
  };
}
