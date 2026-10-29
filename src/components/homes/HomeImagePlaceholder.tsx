import React from 'react';
import Image from 'next/image';
import { Camera } from 'lucide-react';

interface HomeImagePlaceholderProps {
  /** Optional className to control sizing/rounding from the parent. */
  className?: string;
  /** Primary line, e.g. "Photos coming soon". */
  label?: string;
  /** Optional secondary line, e.g. an "add your photos" nudge. */
  subtitle?: string;
}

/** Soft brand dot grid (primary-200 dots on the brand wash). Pure CSS: nothing that reads as a photograph. */
const DOT_PATTERN: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, rgb(191 211 254 / 0.9) 1.25px, transparent 1.5px), linear-gradient(135deg, #f0f5ff 0%, #ffffff 50%, #f5f2fb 100%)',
  backgroundSize: '18px 18px, 100% 100%',
};

/**
 * Branded stand-in for a senior-care listing that has no photos yet. Deliberately an
 * illustration (dot pattern + the CareLinkAI heart mark), never a stock photo, a building
 * drawing or anything that could pass for a picture of a real facility. Photos are
 * operator-added on claim (OL-083), so this doubles as a gentle "add your photos" surface.
 */
export default function HomeImagePlaceholder({
  className = 'h-64 w-full rounded-lg md:h-96',
  label = 'Photos coming soon',
  subtitle,
}: HomeImagePlaceholderProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden ${className}`}
      style={DOT_PATTERN}
      role="img"
      aria-label={label}
      data-testid="home-image-placeholder"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-primary-100">
        <Image src="/images/logo-mark.png" alt="" width={36} height={36} sizes="36px" />
      </div>
      <p className="mt-3 flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1 text-sm font-medium text-primary-700">
        <Camera className="h-4 w-4 text-primary-500" aria-hidden="true" />
        {label}
      </p>
      {subtitle && <p className="mt-1 px-6 text-center text-xs text-neutral-600">{subtitle}</p>}
    </div>
  );
}
