import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/seo/og-image';

/** OL-172 (b) — branded share image (hub). */
export const alt = 'Senior care in Cleveland, OH — CareLinkAI';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ kind: 'hub', title: 'Senior care in Cleveland, OH', subtitle: 'Assisted living, memory care and more across seven counties' });
}
