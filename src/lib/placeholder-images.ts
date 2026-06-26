/**
 * Shared senior-living placeholder photos + deterministic per-home picker.
 *
 * Used for any home that has NO real photo (Places/operator photos always win).
 * The 12 images (Pexels, free for commercial use, no attribution) mix residential
 * exteriors, gardens, and warm common areas so a grid of photo-less homes looks
 * varied instead of repeating one image. A home is assigned one deterministically
 * by `placeholderImageFor(home.id)`, so the SAME home always gets the SAME image —
 * on the search grid AND the listing detail hero.
 *
 * Keep the list static so the assignment stays deterministic across requests.
 */
export const PLACEHOLDER_IMAGES: string[] = [
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782507649/carelinkai/placeholders/placeholder-1.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782507654/carelinkai/placeholders/placeholder-2.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782506198/carelinkai/placeholders/placeholder-3.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782507657/carelinkai/placeholders/placeholder-4.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782507662/carelinkai/placeholders/placeholder-5.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782507667/carelinkai/placeholders/placeholder-6.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782507672/carelinkai/placeholders/placeholder-7.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782506214/carelinkai/placeholders/placeholder-8.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782506217/carelinkai/placeholders/placeholder-9.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782506222/carelinkai/placeholders/placeholder-10.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782506227/carelinkai/placeholders/placeholder-11.jpg',
  'https://res.cloudinary.com/dygtsnu8z/image/upload/v1782506246/carelinkai/placeholders/placeholder-12.jpg',
];

/** Caption shown over a placeholder hero so it's never mistaken for a real facility photo. */
export const PLACEHOLDER_CAPTION = 'Representative photo — pending operator upload.';

/**
 * Stable 32-bit string hash (djb2). Picks a placeholder from a home's id so the
 * SAME home always maps to the SAME image, regardless of page/sort position.
 */
export function hashStringToInt(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0; // hash * 33 + c
  }
  return Math.abs(hash);
}

/**
 * Deterministic placeholder image for a home with no real photo. Stable per `id`.
 * Falls back to the first image for an empty/missing id rather than throwing.
 */
export function placeholderImageFor(id: string | null | undefined): string {
  const key = id && id.length > 0 ? id : 'carelinkai-home';
  return PLACEHOLDER_IMAGES[hashStringToInt(key) % PLACEHOLDER_IMAGES.length];
}
