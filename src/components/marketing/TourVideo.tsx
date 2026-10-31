/**
 * The self-hosted narrated product tour (public/demo/tour.mp4). Plain <video>: no third-party
 * player or request, nothing downloaded until the viewer presses play (preload="none"), English
 * captions on by default, no download button. `autoPlay` is only for the modal, which mounts the
 * video fresh when the viewer presses "Watch the 90-second tour" — so it starts from the beginning.
 */

import type { TourVideo as TourVideoData } from "@/lib/marketing/product-tour-data";

export default function TourVideo({ video, className = "", autoPlay = false }: { video?: TourVideoData | null; className?: string; autoPlay?: boolean }) {
  if (!video) return null;
  return (
    <video
      controls
      playsInline
      preload="none"
      autoPlay={autoPlay}
      controlsList="nodownload"
      poster={video.poster ?? undefined}
      className={`block w-full aspect-video bg-neutral-900 ${className}`}
      data-testid="tour-video"
    >
      <source src={video.src} type="video/mp4" />
      {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}
    </video>
  );
}
