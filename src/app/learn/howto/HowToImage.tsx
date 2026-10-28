'use client';

import { useState } from 'react';
import { howtoImageUrl } from '@/lib/howto/images';

interface Props {
  image?: string;
  alt?: string;
}

/**
 * Renders a how-to step image, degrading to a neutral placeholder when there
 * is no image key OR the asset file is missing (the assets are not all
 * captured yet). Avoids broken-image icons in the public hub.
 */
export default function HowToImage({ image, alt }: Props) {
  const url = howtoImageUrl(image);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="mt-3 flex h-40 w-full items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-sm text-neutral-400">
        <span>🖼️ Screenshot coming soon</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt || 'How-to step illustration'}
      className="mt-3 w-full rounded-lg border border-neutral-200"
      onError={() => setFailed(true)}
    />
  );
}
