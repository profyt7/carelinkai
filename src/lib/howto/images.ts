/**
 * How-To guide image handling.
 *
 * The guide step images (the vault `(img: …)` placeholders) are not captured
 * yet. Until the asset files land under /public/howto/, callers should render
 * a graceful placeholder instead of a broken image. The component using this
 * decides whether to render an <img> or the placeholder based on whether a
 * known asset exists.
 */

/** Where captured how-to assets live, served statically from /public. */
export const HOWTO_IMAGE_BASE = '/howto';

/**
 * Resolves a step image key to its public URL, or null when there is no image
 * key. Returning a URL does not guarantee the file exists — components must
 * still degrade gracefully (e.g., onError fallback) since assets may be
 * missing.
 */
export function howtoImageUrl(image?: string): string | null {
  if (!image) return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//.test(trimmed)) return trimmed;
  const clean = trimmed.replace(/^\/+/, '');
  return `${HOWTO_IMAGE_BASE}/${clean}`;
}
