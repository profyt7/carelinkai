'use client';

import { useEffect, useRef, useState } from 'react';
import { FiCheck, FiChevronRight, FiClipboard, FiDollarSign, FiImage, FiMap, FiMapPin } from 'react-icons/fi';
import AvailabilityBadge, { UNVERIFIED_AVAILABILITY } from '@/components/availability/AvailabilityBadge';
import GoogleRatingBadge from '@/components/homes/GoogleRatingBadge';
import PriceLine from '@/components/ui/PriceLine';
import SidebarShell from '@/components/layout/SidebarShell';
import { FAMILY_NAV } from './FamilyDashboardPreview';
import type { DirectionDCard } from './fixtures';
import { BTN_PRIMARY, BTN_SECONDARY, IVORY_HERO, IVORY_PAGE, LINK, PublicTopNav, type Mode, type Viewer } from './shared';

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'amenities', label: 'Amenities' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'location', label: 'Location' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'inspections', label: 'Inspections' },
];
const sid = (id: string) => `d-profile-${id}`;

const CARE_LABEL: Record<string, string> = { ASSISTED: 'Assisted Living', MEMORY_CARE: 'Memory Care', INDEPENDENT: 'Independent Living' };

// Preview fixtures: listing copy as an operator would write it, amenities "as reported by the community",
// and one ODH survey row — all fields the app already stores.
const ABOUT =
  'A single-story community on a quiet street off Detroit Road with a secure memory care neighborhood, a walking garden, and a dining room that serves three meals a day.';
const AMENITIES = ['Private apartments', 'Secure memory care wing', 'Walking garden', 'Housekeeping & laundry', 'Scheduled transportation', 'On-site salon'];
const INSPECTION = { date: 'Mar 4, 2026', type: 'Standard survey', citations: 2, license: 'ODH license 0123-RC' };

/**
 * Below 1024px the inquiry panel scrolls away, so a sticky bottom bar carries the same two
 * actions. It is the LAST element in the page flow (sticky bottom-0), so its own height is
 * the bottom padding: the final section and the claim line always scroll clear of it. For a
 * guest it adds the safe-area inset (the mobile-tab-bar `safe-bottom` pattern); signed in, the
 * page scrolls inside the shell, above the tab bar, so the bar can never overlap it. Hidden
 * (and inert) while the inline inquiry panel is on screen.
 */
function StickyInquiryBar({ hidden, safeArea }: { hidden: boolean; safeArea: boolean }) {
  return (
    <div
      data-testid="d-profile-sticky-cta"
      data-hidden={hidden}
      aria-hidden={hidden || undefined}
      // React 19 (Next's app router) takes inert as a boolean.
      {...(hidden ? ({ inert: true } as Record<string, unknown>) : {})}
      className={`sticky bottom-0 z-20 border-t border-neutral-200 bg-white/95 px-4 pt-3 shadow-dropdown backdrop-blur motion-safe:transition-all motion-safe:duration-200 ${
        safeArea ? 'safe-bottom' : ''
      } ${hidden ? 'pointer-events-none translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}
      style={{ paddingBottom: safeArea ? 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' : '0.75rem' }}
    >
      <div className="flex gap-2">
        <button type="button" className={`${BTN_PRIMARY} flex-1`}>Schedule a tour</button>
        <button type="button" className={`${BTN_SECONDARY} flex-1`}>Send an inquiry</button>
      </div>
    </div>
  );
}

/** (iii) Facility profile, family view: header + gallery, key stats, sticky section nav, ONE inquiry pathway. */
export default function FacilityProfilePreview({ mode, home, viewer = 'guest' }: { mode: Mode; home: DirectionDCard; viewer?: Viewer }) {
  const mobile = mode === 'mobile';
  const desktop = mode === 'desktop';
  const signedIn = viewer === 'family';
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelInView, setPanelInView] = useState(true);

  useEffect(() => {
    const el = panelRef.current;
    if (desktop || !el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => setPanelInView(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [desktop, mode, viewer]);
  const pad = mobile ? 'px-5' : 'px-8';
  const availability = home.availabilityFreshness ?? UNVERIFIED_AVAILABILITY;
  const city = [home.address?.city, home.address?.state].filter(Boolean).join(', ');

  const inquiryPanel = (
    <section aria-labelledby="d-profile-cta" className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <h5 id="d-profile-cta" className="text-base font-semibold text-neutral-900">Interested in this community?</h5>
      <div className="mt-3 space-y-2">
        <AvailabilityBadge availability={availability} />
        <PriceLine pricing={home.pricing} />
      </div>
      <div className="mt-4 space-y-2">
        <button type="button" className={`${BTN_PRIMARY} w-full`}>Schedule a tour</button>
        <button type="button" className={`${BTN_SECONDARY} w-full`}>Send an inquiry</button>
      </div>
      <p className="mt-3 text-xs text-neutral-600">Free for families. A person from our care team follows up within one business hour, Mon–Fri.</p>
    </section>
  );

  const page = (
    <div className={IVORY_PAGE}>
      {!signedIn && <PublicTopNav mode={mode} label="Site (profile preview)" />}

      <div className={`${IVORY_HERO} ${pad} pb-6 pt-5`}>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm text-neutral-600">
          <a href="#" onClick={(e) => e.preventDefault()} className={LINK}>Cleveland</a>
          <FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <a href="#" onClick={(e) => e.preventDefault()} className={LINK}>Assisted living</a>
          <FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-current="page">{home.address?.city}</span>
        </nav>

        {/* Gallery: hero + two thumbs on desktop/tablet, one image + count on mobile */}
        <div className={`mt-4 grid gap-2 overflow-hidden rounded-xl ${mobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- preview uses repo images, same as the listing page */}
          <img src={home.imageUrl ?? ''} alt={`${home.name} exterior`} className={`w-full object-cover ${mobile ? 'h-56' : 'col-span-2 h-80'}`} />
          {!mobile && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/homes/1.jpg" alt={`${home.name} kitchen`} className="h-80 w-full object-cover" />
              <button type="button" className={`${BTN_SECONDARY} absolute bottom-3 right-3 py-1.5`}>
                <FiImage className="h-4 w-4" aria-hidden="true" /> All photos
              </button>
            </div>
          )}
        </div>

        <div className="mt-5">
          <h4 className={`font-serif text-neutral-900 ${mobile ? 'text-3xl' : 'text-4xl'}`}>{home.name}</h4>
          <p className="mt-1 flex items-center gap-1 text-sm text-neutral-700">
            <FiMapPin className="h-4 w-4" aria-hidden="true" /> {city}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <GoogleRatingBadge rating={home.googleRating} count={home.googleRatingCount} />
          </div>
        </div>

        {/* Key stats row */}
        <dl className={`mt-5 grid gap-3 ${mobile ? 'grid-cols-1' : desktop ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {[
            { k: 'Care types', v: <span className="text-sm font-semibold text-neutral-900">{home.careLevel.map((c) => CARE_LABEL[c] ?? c).join(' · ')}</span> },
            { k: 'Availability', v: <AvailabilityBadge availability={availability} /> },
            { k: 'Pricing', v: <PriceLine pricing={home.pricing} /> },
            { k: 'State inspection', v: <span className="text-sm font-semibold text-neutral-900">{INSPECTION.date} · {INSPECTION.citations} citations</span> },
          ].map((s) => (
            <div key={s.k} className="rounded-xl border border-neutral-200 bg-white p-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-neutral-600">{s.k}</dt>
              <dd className="mt-2">{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Section nav inside the sticky bar */}
      <nav aria-label="Profile sections" className="sticky top-0 z-10 border-y border-neutral-200 bg-white">
        <ul className={`flex gap-1 overflow-x-auto ${pad}`}>
          {SECTIONS.map((s, i) => (
            <li key={s.id} className="flex-shrink-0">
              <a
                href={`#${sid(s.id)}`}
                aria-current={i === 0 ? 'location' : undefined}
                className={`block border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 motion-safe:transition-colors ${
                  i === 0 ? 'border-primary-600 text-primary-700' : 'border-transparent text-neutral-700 hover:border-neutral-300 hover:text-neutral-900'
                }`}
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className={`${pad} py-8 ${desktop ? 'grid grid-cols-3 gap-8' : ''}`}>
        <div className={`space-y-8 ${desktop ? 'col-span-2' : ''}`}>
          {!desktop && <div ref={panelRef}>{inquiryPanel}</div>}

          <section id={sid('about')} aria-labelledby={`${sid('about')}-h`} className="rounded-xl border border-neutral-200 bg-white p-6">
            <h5 id={`${sid('about')}-h`} className="text-lg font-semibold text-neutral-900">About</h5>
            <p className="mt-2 text-sm leading-relaxed text-neutral-700">{ABOUT}</p>
          </section>

          <section id={sid('amenities')} aria-labelledby={`${sid('amenities')}-h`} className="rounded-xl border border-neutral-200 bg-white p-6">
            <h5 id={`${sid('amenities')}-h`} className="text-lg font-semibold text-neutral-900">Amenities</h5>
            <p className="mt-1 text-xs text-neutral-600">As reported by the community.</p>
            <ul className={`mt-3 grid gap-2 ${mobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {AMENITIES.map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm text-neutral-700">
                  <FiCheck className="h-4 w-4 flex-shrink-0 text-primary-600" aria-hidden="true" /> {a}
                </li>
              ))}
            </ul>
          </section>

          <section id={sid('pricing')} aria-labelledby={`${sid('pricing')}-h`} className="rounded-xl border border-neutral-200 bg-white p-6">
            <h5 id={`${sid('pricing')}-h`} className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <FiDollarSign className="h-5 w-5 text-neutral-600" aria-hidden="true" /> Pricing
            </h5>
            <PriceLine pricing={home.pricing} className="mt-2" />
            <p className="mt-1 text-sm text-neutral-600">Prices vary by care level and apartment. Ask the community for an exact quote.</p>
          </section>

          <section id={sid('location')} aria-labelledby={`${sid('location')}-h`} className="rounded-xl border border-neutral-200 bg-white p-6">
            <h5 id={`${sid('location')}-h`} className="text-lg font-semibold text-neutral-900">Location</h5>
            <p className="mt-1 text-sm text-neutral-700">{city}</p>
            <div className="mt-3 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50">
              <FiMap className="h-7 w-7 text-neutral-500" aria-hidden="true" />
              <p className="mt-2 text-xs text-neutral-600">The app renders the existing MapTiler map here.</p>
            </div>
          </section>

          <section id={sid('reviews')} aria-labelledby={`${sid('reviews')}-h`} className="rounded-xl border border-neutral-200 bg-white p-6">
            <h5 id={`${sid('reviews')}-h`} className="text-lg font-semibold text-neutral-900">Reviews</h5>
            <GoogleRatingBadge rating={home.googleRating} count={home.googleRatingCount} className="mt-2" />
            <p className="mt-2 text-sm text-neutral-600">Rating and count from Google. CareLinkAI doesn’t republish review text.</p>
          </section>

          <section id={sid('inspections')} aria-labelledby={`${sid('inspections')}-h`} className="rounded-xl border border-neutral-200 bg-white p-6">
            <h5 id={`${sid('inspections')}-h`} className="flex items-center gap-2 text-lg font-semibold text-neutral-900">
              <FiClipboard className="h-5 w-5 text-neutral-600" aria-hidden="true" /> State inspections
            </h5>
            <p className="mt-2 text-sm text-neutral-700">
              {INSPECTION.type} on {INSPECTION.date} · {INSPECTION.citations} citations · {INSPECTION.license}
            </p>
            <p className="mt-1 text-xs text-neutral-600">Source: Ohio Department of Health.</p>
          </section>
        </div>

        {desktop && <div><div className="sticky top-16">{inquiryPanel}</div></div>}
      </div>

      {/* Claim message demoted to a quiet footer strip for families */}
      <div className={`border-t border-neutral-200 bg-white ${pad} py-4`}>
        <p className="text-sm text-neutral-600">
          Operate this community?{' '}
          <a href="#" onClick={(e) => e.preventDefault()} className={LINK}>Claim this listing</a> to add photos and keep availability current.
        </p>
      </div>

      {!desktop && <StickyInquiryBar hidden={panelInView} safeArea={!signedIn} />}
    </div>
  );

  if (!signedIn) return page;
  // Logged in = sidebar, never the top nav. The page scrolls inside the shell, above its mobile tab bar.
  return (
    <SidebarShell
      tone="light"
      items={FAMILY_NAV}
      activeId="find"
      mobileTabIds={['home', 'find', 'saved', 'messages']}
      user={{ name: 'Angela Brooks', roleLabel: 'Family' }}
      viewport={mode}
      embedded
      navLabel="Family navigation (profile preview)"
      workspaceClassName={IVORY_PAGE}
    >
      {page}
    </SidebarShell>
  );
}
