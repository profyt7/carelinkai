"use client";

import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";
import TourVideo from "@/components/marketing/TourVideo";
import type { TourVideo as TourVideoData } from "@/lib/marketing/product-tour-data";

// The self-hosted tour (public/demo/tour.mp4) in a dialog. No video → the modal never renders. The
// video mounts fresh on every open and plays from the start (the open is the viewer's own click);
// Escape or Close shuts it, Tab stays inside, and focus goes back to whatever opened it.
interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
  video?: TourVideoData | null;
}

export default function DemoVideoModal({ open, onClose, video }: DemoVideoModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnTo.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button, video, [href], [tabindex]:not([tabindex='-1'])"));
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      returnTo.current?.focus();
    };
  }, [open, onClose]);

  if (!open || !video) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-testid="tour-video-modal"
    >
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="CareLinkAI 90-second tour" className="relative w-full max-w-4xl">
        <button
          ref={closeRef}
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-1 text-white/80 hover:text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
        >
          <FiX size={18} />
          Close
        </button>

        <div className="rounded-xl overflow-hidden shadow-2xl">
          <TourVideo video={video} autoPlay />
        </div>
      </div>
    </div>
  );
}
