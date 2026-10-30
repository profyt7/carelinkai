"use client";

import { useEffect } from "react";
import { FiX } from "react-icons/fi";

// NEXT_PUBLIC_DEMO_VIDEO_ID = the YouTube video id. Unset → the modal never renders
// (the homepage also hides its button), so no setup text can reach a visitor.
const DEMO_VIDEO_ID = (process.env.NEXT_PUBLIC_DEMO_VIDEO_ID || "").trim();

interface DemoVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DemoVideoModal({ open, onClose }: DemoVideoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !DEMO_VIDEO_ID) return null;

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

        <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
          <iframe
            src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0`}
            title="CareLinkAI Product Demo"
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
