"use client";

import { useState } from "react";
import Link from "next/link";
import { FiArrowRight } from "react-icons/fi";
import DemoVideoModal from "@/components/marketing/DemoVideoModal";
import type { TourVideo as TourVideoData } from "@/lib/marketing/product-tour-data";
import { GET_STARTED_ANCHOR, getStartedLinks } from "@/lib/marketing/get-started-links";
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from "@/lib/contact";

/**
 * OL-248 h — "Get started on your own": replaces the homepage demo-request form. The 90-second tour is
 * the one primary action (the existing self-hosted /demo/tour.mp4 in the existing dialog; it starts from
 * the beginning and focus comes back to the button on close). Role links sit underneath as a compact
 * secondary set — stacked on phones, a small grid on desktop. No form, nothing collected.
 */
export default function GetStartedPanel({ tourVideo = null, providerListingOn = false }: { tourVideo?: TourVideoData | null; providerListingOn?: boolean }) {
  const [open, setOpen] = useState(false);
  const links = getStartedLinks({ providerListingOn });

  return (
    <section id={GET_STARTED_ANCHOR} className="py-20 bg-white border-t border-neutral-100 scroll-mt-20" data-testid="get-started-panel">
      {tourVideo && <DemoVideoModal open={open} onClose={() => setOpen(false)} video={tourVideo} />}
      <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4 leading-tight">Get started on your own</h2>
        <p className="text-neutral-600 text-lg mb-8 max-w-2xl mx-auto" data-testid="get-started-subhead">
          {tourVideo
            ? "Watch the 90-second tour, then jump straight to what you need. Getting started is free."
            : "Jump straight to what you need. Getting started is free."}
        </p>
        {tourVideo && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center bg-primary-600 hover:bg-primary-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300"
            data-testid="get-started-watch-tour"
          >
            <span>
              <span aria-hidden="true">▶ </span>Watch the 90-second tour
            </span>
          </button>
        )}

        <ul
          className={`mt-10 grid grid-cols-1 gap-2 text-left sm:grid-cols-2 ${links.length > 4 ? "lg:grid-cols-3" : ""}`}
          data-testid="get-started-links"
          aria-label="Jump to what you need"
        >
          {links.map((l) => (
            <li key={l.key}>
              <Link
                href={l.href}
                className="group flex h-full items-start justify-between gap-3 rounded-lg border border-neutral-200 px-4 py-3 hover:border-primary-400 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                data-testid={`get-started-link-${l.key}`}
              >
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-neutral-500">{l.audience}</span>
                  <span className="block text-sm font-semibold text-neutral-900">{l.label}</span>
                  {l.hint && <span className="mt-0.5 block text-xs text-neutral-500">{l.hint}</span>}
                </span>
                <FiArrowRight className="mt-4 flex-shrink-0 text-primary-600 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-6">
          <Link href="/help" className="text-sm font-semibold text-primary-700 hover:underline" data-testid="get-started-guides">
            Step-by-step guides →
          </Link>
        </p>
        <p className="mt-6 text-sm text-neutral-600" data-testid="get-started-footer">
          Questions? Call{" "}
          <a href={CONTACT_PHONE_TEL} className="font-semibold text-primary-700 hover:underline">
            {CONTACT_PHONE_DISPLAY}
          </a>{" "}
          or{" "}
          <Link href="/contact" className="font-semibold text-primary-700 hover:underline">
            send us a message
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
