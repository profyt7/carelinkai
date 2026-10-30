import type { Metadata } from 'next';
import HomePageClient from './HomePageClient';
import { isPaidFeatureEnabled } from '@/lib/billing/paid-features';
import { loadProductTour } from '@/lib/marketing/product-tour';

/**
 * Home page (server shell). The marketing page itself is a large client
 * component (HomePageClient.tsx, unchanged). The Organization JSON-LD now
 * comes from the root layout on every page (OL-172 c).
 */

// OL-172 (a)(b): the homepage's own title / description / share card (no "AI" pitch).
export const metadata: Metadata = {
  // The root layout's title template does not apply to the page in its own segment, so the suffix is written once here.
  title: { absolute: 'Cleveland Assisted Living, Every Fact Labeled | CareLinkAI' },
  description:
    'Assisted living and memory care across Greater Cleveland, plus in-home care and service providers. Every fact labeled verified or not. Free for families.',
  alternates: { canonical: 'https://getcarelinkai.com/' },
  openGraph: {
    title: 'Cleveland Assisted Living, Every Fact Labeled | CareLinkAI',
    description:
      'Assisted living and memory care across Greater Cleveland, plus in-home care and service providers. Every fact labeled verified or not. Free for families.',
    type: 'website',
    url: 'https://getcarelinkai.com/',
    siteName: 'CareLinkAI',
    images: [{ url: '/images/og-image.jpg', width: 1200, height: 630, alt: 'CareLinkAI — Cleveland senior living' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cleveland Assisted Living, Every Fact Labeled | CareLinkAI',
    description:
      'Assisted living and memory care across Greater Cleveland, plus in-home care and service providers. Every fact labeled verified or not. Free for families.',
    images: ['/images/twitter-image.jpg'],
  },
};

export default function HomePage() {
  // 10/29 provider pricing flags (server-read). Both default off → the persona row is unchanged.
  return (
    <HomePageClient
      providerListingOn={isPaidFeatureEnabled('PROVIDER_LISTING')}
      providerBoostOn={isPaidFeatureEnabled('PROVIDER_BOOST')}
      // Homepage truth audit: "Now Live" / "Coming Soon" cards follow the product's own flags.
      ridesPaymentsOn={isPaidFeatureEnabled('RIDES_PAYMENTS')}
      backgroundChecksOn={isPaidFeatureEnabled('BACKGROUND_CHECKS')}
      operatorPlansOn={isPaidFeatureEnabled('OPERATOR_PLANS')}
      complianceKitsOn={isPaidFeatureEnabled('COMPLIANCE_KITS')}
      // Prices for flag-off products stay hidden (Caregiver Pro).
      caregiverProOn={isPaidFeatureEnabled('CAREGIVER_PRO')}
      // Demo-section product tour: only when /public/demo/tour.json exists.
      tour={loadProductTour()}
    />
  );
}
