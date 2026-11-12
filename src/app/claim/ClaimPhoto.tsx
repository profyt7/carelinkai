'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The listing's photo on the claim landing; hides itself if it fails to load (no broken-image box).
 * The image can fail before React hydrates (onError never fires), so also check it once mounted.
 */
export default function ClaimPhoto({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} onError={() => setFailed(true)} className="h-48 w-full object-cover sm:h-56" data-testid="claim-photo" />
  );
}
