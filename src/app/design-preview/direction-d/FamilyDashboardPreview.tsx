'use client';

import { useState } from 'react';
import {
  FiBookOpen, FiCalendar, FiHeart, FiHeadphones, FiHome, FiMap, FiMessageSquare, FiSearch, FiSend, FiUser, FiZap,
} from 'react-icons/fi';
import SidebarShell, { type SidebarNavItem } from '@/components/layout/SidebarShell';
import SearchResultCard from '@/components/search/SearchResultCard';
import type { DirectionDCard } from './fixtures';
import { BTN_PRIMARY, BTN_SECONDARY, IVORY_HERO, IVORY_PAGE, StateCaption, type Mode } from './shared';

export const FAMILY_NAV: SidebarNavItem[] = [
  { id: 'home', label: 'Home', icon: <FiHome /> },
  { id: 'find', label: 'Find Care', icon: <FiSearch /> },
  { id: 'match', label: 'AI Match', icon: <FiZap /> },
  { id: 'saved', label: 'Saved Homes', shortLabel: 'Saved', icon: <FiHeart /> },
  { id: 'inquiries', label: 'My Inquiries', icon: <FiSend /> },
  { id: 'tours', label: 'Tours', icon: <FiCalendar /> },
  { id: 'messages', label: 'Messages', icon: <FiMessageSquare />, badge: 1 },
  { id: 'resources', label: 'Care Resources', icon: <FiBookOpen /> },
  { id: 'account', label: 'Account', icon: <FiUser /> },
];

/** The $399 concierge CTA — an icon, never a stock face. */
function HelpCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface-raised text-primary-700 shadow-card" aria-hidden="true">
        <FiHeadphones className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-semibold text-neutral-900">Need help? Talk to the care team</p>
      {!compact && <p className="mt-1 text-sm text-neutral-700">A care advisor can shortlist homes and set up tours with you.</p>}
      <button type="button" className={`${BTN_PRIMARY} mt-3 w-full`}>Talk to the care team</button>
    </div>
  );
}

/** (ii) Family — logged-in dashboard home: light sidebar, ivory page, white cards. */
export default function FamilyDashboardPreview({ mode, cards }: { mode: Mode; cards: DirectionDCard[] }) {
  const [active, setActive] = useState('home');
  const mobile = mode === 'mobile';
  const cols = mode === 'desktop' ? 'grid-cols-2' : mode === 'tablet' ? 'grid-cols-2' : 'grid-cols-1';
  const pad = mobile ? 'px-5' : 'px-8';

  return (
    <SidebarShell
      tone="light"
      items={FAMILY_NAV}
      activeId={active}
      onSelect={setActive}
      mobileTabIds={['home', 'find', 'saved', 'messages']}
      user={{ name: 'Angela Brooks', roleLabel: 'Family' }}
      sidebarFooter={<HelpCard />}
      viewport={mode}
      embedded
      navLabel="Family navigation (preview)"
      workspaceClassName={IVORY_PAGE}
    >
      <div className={`${IVORY_HERO} ${pad} ${mobile ? 'py-6' : 'py-8'}`}>
        <h4 className={`font-serif text-neutral-900 ${mobile ? 'text-2xl' : 'text-4xl'}`}>Welcome back, Angela</h4>
        <p className="mt-1 text-sm text-neutral-700">Here’s where your search for Mom stands.</p>
        <div className={`mt-5 grid gap-3 ${mobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
          {[
            { label: 'Saved homes', value: '4', icon: <FiHeart /> },
            { label: 'Inquiries sent', value: '2', icon: <FiSend /> },
            { label: 'Next tour · Maple Grove', value: 'Thu, Oct 30, 2 PM', icon: <FiCalendar /> },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-3 rounded-xl border border-line bg-surface-raised p-4">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700" aria-hidden="true">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-neutral-600">{t.label}</p>
                <p className="truncate text-sm font-semibold text-neutral-900">{t.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`${pad} space-y-8 py-8`}>
        {mobile && <HelpCard compact />}

        <section aria-labelledby="d-fam-featured">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h5 id="d-fam-featured" className="text-lg font-semibold text-neutral-900">Homes that fit your search</h5>
              <p className="text-sm text-neutral-600">Assisted living near Westlake · budget up to $5,500/mo</p>
            </div>
            {!mobile && <button type="button" className={BTN_SECONDARY}>See all results</button>}
          </div>
          <ul className={`mt-4 grid gap-5 ${cols}`}>
            {cards.map((c) => (
              <li key={c.id} className="flex flex-col">
                <SearchResultCard headingLevel={6} home={c} href="#" className="flex-1" />
                <StateCaption>{c.state}</StateCaption>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="d-fam-map" className="rounded-xl border border-line bg-surface-raised p-5">
          <h5 id="d-fam-map" className="text-base font-semibold text-neutral-900">Your saved homes on the map</h5>
          <div className={`mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-center ${mobile ? 'h-48' : 'h-64'}`}>
            <FiMap className="h-8 w-8 text-neutral-500" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium text-neutral-700">Map placeholder</p>
            <p className="text-xs text-neutral-600">The app renders the existing MapTiler map here.</p>
          </div>
        </section>
      </div>
    </SidebarShell>
  );
}
