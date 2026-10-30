import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { isPaidFeatureEnabled } from '@/lib/billing/paid-features';

/**
 * Home page (server shell). The marketing page itself is a large client
 * component (HomePageClient.tsx, unchanged). The Organization JSON-LD now
 * comes from the root layout on every page (OL-172 c).
 */

// OL-172 (a)(b): the homepage's own title / description / share card (no "AI" pitch).
export const metadata: Metadata = {
  // The root layout's title template does not apply to the page in its own segment, so the suffix is written once here.
  title: { absolute: 'Cleveland Senior Living, Free for Families | CareLinkAI' },
  description:
    'Licensed assisted living and memory care homes across Greater Cleveland. We show which open beds and prices are verified, and when. Free for families.',
  alternates: { canonical: 'https://getcarelinkai.com/' },
  openGraph: {
    title: 'Cleveland Senior Living, Free for Families | CareLinkAI',
    description:
      'Licensed assisted living and memory care homes across Greater Cleveland. We show which open beds and prices are verified, and when. Free for families.',
    type: 'website',
    url: 'https://getcarelinkai.com/',
    siteName: 'CareLinkAI',
    images: [{ url: '/images/og-image.jpg', width: 1200, height: 630, alt: 'CareLinkAI — Cleveland senior living' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cleveland Senior Living, Free for Families | CareLinkAI',
    description:
      'Licensed assisted living and memory care homes across Greater Cleveland. We show which open beds and prices are verified, and when. Free for families.',
    images: ['/images/twitter-image.jpg'],
  },
};

export default function HomePage() {
  // 10/29 provider pricing flags (server-read). Both default off → the persona row is unchanged.
  return (
    <HomePageClient
      providerListingOn={isPaidFeatureEnabled('PROVIDER_LISTING')}
      providerBoostOn={isPaidFeatureEnabled('PROVIDER_BOOST')}
    />
  );
}
