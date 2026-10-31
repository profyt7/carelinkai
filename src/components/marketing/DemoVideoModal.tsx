"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";
import TourVideo from "@/components/marketing/TourVideo";
import type { TourVideo as TourVideoData } from "@/lib/marketing/product-tour-data";

// The self-hosted tour (public/demo/tour.mp4). No video → the modal never renders (the homepage
// also hides its button). No autoplay, no third-party player.
interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
  video?: TourVideoData | null;
}

export default function DemoVideoModal({ open, onClose, video }: DemoVideoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !video) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl">
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex items-center gap-1 text-white/80 hover:text-white text-sm"
        >
          <FiX size={18} />
          Close
        </button>

        <div className="rounded-xl overflow-hidden shadow-2xl">
          <TourVideo video={video} />
        </div>
      </div>
    </div>
  );
}
