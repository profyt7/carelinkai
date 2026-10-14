import HomePageClient from './HomePageClient';
import { buildOrganizationJsonLd } from '@/lib/seo/jsonld';

/**
 * Home page (server shell). The marketing page itself is a large client
 * component (HomePageClient.tsx, unchanged); this wrapper exists so the
 * Organization JSON-LD (sprint W3 item 6d) is in the server HTML, where
 * crawlers and AI answer engines read it.
 */
export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationJsonLd()) }} />
      <HomePageClient />
    </>
  );
}
