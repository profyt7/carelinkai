import { notFound } from 'next/navigation';
import { findSuburb } from '@/lib/directory/suburbs';
import { OG_CONTENT_TYPE, OG_SIZE, renderOgImage } from '@/lib/seo/og-image';

/** OL-172 (b) — branded share image (suburb): one per suburb page, the suburb's own name. */
export const alt = 'Assisted living by suburb — CareLinkAI';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ suburb: string }> }) {
  const { suburb } = await params;
  const s = findSuburb(suburb);
  if (!s) notFound();
  return renderOgImage({ kind: 'suburb', title: `Assisted living in ${s.name}, OH`, subtitle: `${s.county} County · licensed homes, inspection facts, open beds confirmed` });
}
