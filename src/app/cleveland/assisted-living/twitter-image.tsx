import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/seo/og-image';

/** OL-172 (b) — branded share image (care-type). */
export const alt = 'Assisted living in Cleveland, OH — CareLinkAI';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ kind: 'care-type', title: 'Assisted living in Cleveland, OH', subtitle: 'Licensed homes, Medicaid waiver status, what’s verified and when' });
}
