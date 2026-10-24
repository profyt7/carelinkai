import type { Metadata } from 'next';
import { PAGE_META, publicMetadata } from '@/lib/seo/page-meta';

// OL-172 (a)(b): /search is a client page, so its title / description / share card live here.
export const metadata: Metadata = publicMetadata({ ...PAGE_META.search, image: '/images/og-image.jpg' });

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
