import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/seo/og-image';

/** OL-172 (b) — branded share image (care-type). */
export const alt = 'Nursing homes in Cleveland, OH — CareLinkAI';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ kind: 'care-type', title: 'Nursing homes in Cleveland, OH', subtitle: 'How skilled nursing differs, and who pays' });
}
