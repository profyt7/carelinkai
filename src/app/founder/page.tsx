/**
 * /founder — self-hosted founder intro video (replaces the HeyGen public link).
 *
 * Link-only landing page for hospital discharge planners, surfaced from the DP
 * follow-up sequence (Touch 1 + Touch 3, see src/lib/dp-outreach/copy.ts). No
 * auth, no app chrome, no forms, no tracking beyond the site-wide defaults.
 * The MP4 + poster live in public/ so the video never depends on a third-party
 * subscription again.
 */

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Public paths for the self-hosted assets (served from public/). Not exported —
// App Router pages may only export the Next.js-recognised names.
const FOUNDER_VIDEO_SRC = '/founder-intro.mp4';
const FOUNDER_VIDEO_POSTER = '/founder-intro-poster.jpg';

export const metadata: Metadata = {
  title: 'A 40-second intro from our founder',
  description: 'A short intro to CareLinkAI from founder Chris Tolliver.',
  // Link-only page for planners — keep it out of search indexes.
  robots: { index: false, follow: false },
};

export default function FounderPage() {
  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-[720px]">
        <p className="text-center text-sm font-semibold tracking-wide text-primary-600">CareLinkAI</p>
        <h1 className="mt-3 text-center text-2xl font-semibold text-neutral-900 sm:text-3xl">
          A 40-second intro from our founder
        </h1>

        <video
          className="mt-8 w-full rounded-xl bg-black shadow-sm"
          controls
          playsInline
          preload="metadata"
          poster={FOUNDER_VIDEO_POSTER}
          src={FOUNDER_VIDEO_SRC}
        >
          Your browser can’t play this video.{' '}
          <a href={FOUNDER_VIDEO_SRC} className="underline">Download it here.</a>
        </video>

        <p className="mt-6 text-center text-sm text-neutral-600">
          Have a patient to place? Reply to the email you received or contact{' '}
          <a href="mailto:placements@getcarelinkai.com" className="font-medium text-primary-600 underline">
            placements@getcarelinkai.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
