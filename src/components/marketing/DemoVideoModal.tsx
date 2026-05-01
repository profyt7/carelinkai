"use client";

import { useEffect } from "react";
import { FiX, FiPlay } from "react-icons/fi";

// Replace DEMO_VIDEO_ID with your YouTube video ID once you have one.
// e.g. if your URL is https://www.youtube.com/watch?v=dQw4w9WgXcQ the ID is dQw4w9WgXcQ
const DEMO_VIDEO_ID = process.env.NEXT_PUBLIC_DEMO_VIDEO_ID || "";

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

  if (!open) return null;

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

        {DEMO_VIDEO_ID ? (
          <div className="aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0`}
              title="CareLinkAI Product Demo"
              className="w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          /* Placeholder — shown until a real video ID is configured */
          <div className="aspect-video rounded-xl overflow-hidden shadow-2xl bg-neutral-900 flex flex-col items-center justify-center gap-4">
            <div className="h-20 w-20 rounded-full bg-primary-600 flex items-center justify-center">
              <FiPlay size={36} className="text-white ml-1" />
            </div>
            <p className="text-white text-lg font-semibold">Demo video coming soon</p>
            <p className="text-neutral-400 text-sm text-center max-w-xs">
              Set <code className="bg-neutral-800 px-1 rounded">NEXT_PUBLIC_DEMO_VIDEO_ID</code> to your YouTube video ID to enable this.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
