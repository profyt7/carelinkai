import React from 'react';
import { Building2, Camera } from 'lucide-react';

interface HomeImagePlaceholderProps {
  /** Optional className to control sizing/rounding from the parent. */
  className?: string;
  /** Primary line, e.g. "Photos coming soon". */
  label?: string;
  /** Optional secondary line, e.g. an "add your photos" nudge. */
  subtitle?: string;
}

/**
 * Clean, branded stand-in for a senior-care listing that has no photos yet.
 * Intentionally NOT a stock photo of a different building and NOT a broken
 * image — an honest placeholder. Photos are operator-added on claim
 * (OL-083), so this doubles as a gentle "add your photos" surface.
 */
export default function HomeImagePlaceholder({
  className = 'h-64 w-full rounded-lg md:h-96',
  label = 'Photos coming soon',
  subtitle,
}: HomeImagePlaceholderProps) {
  return (
    <div
      className={`relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary-50 via-white to-secondary-50 ${className}`}
      role="img"
      aria-label={label}
    >
      {/* Soft branded badge */}
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/70 shadow-sm ring-1 ring-primary-100">
        <Building2 className="h-8 w-8 text-primary-300" />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-primary-700">
        <Camera className="h-4 w-4 text-primary-400" />
        {label}
      </p>
      {subtitle && <p className="mt-1 px-6 text-center text-xs text-neutral-500">{subtitle}</p>}
    </div>
  );
}
