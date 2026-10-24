import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/seo/og-image';

/** OL-172 (b) — branded share image (concierge). */
export const alt = 'Family Concierge — CareLinkAI';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgImage({ kind: 'concierge', title: 'A verified shortlist in 2 business days', subtitle: 'Private pay. Free when Medicaid, Medicare or the VA pays.' });
}
