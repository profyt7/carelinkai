import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/seo/og-image';

/** OL-172 (b) — branded share image (care-type). */
export const alt = 'Independent living in Cleveland, OH — CareLinkAI';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ kind: 'care-type', title: 'Independent living in Cleveland, OH', subtitle: 'Communities and the licensed homes that offer it' });
}
