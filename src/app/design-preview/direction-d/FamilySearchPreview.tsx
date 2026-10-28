'use client';

import { useState } from 'react';
import { FiChevronDown, FiGrid, FiList, FiSearch, FiSliders } from 'react-icons/fi';
import SearchResultCard from '@/components/search/SearchResultCard';
import type { DirectionDCard } from './fixtures';
import { BTN_PRIMARY, IVORY_HERO, IVORY_PAGE, PublicTopNav, StateCaption, type Mode } from './shared';

const CHIPS = ['Care level', 'Budget', 'Location', 'Availability', 'More filters'];

/** (i) Family — public search, logged out: top nav only, DM Serif hero, chips, honest count, cards. */
export default function FamilySearchPreview({ mode, cards }: { mode: Mode; cards: DirectionDCard[] }) {
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [compare, setCompare] = useState<Set<string>>(new Set());
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };
  const mobile = mode === 'mobile';
  const cols = mode === 'desktop' ? 'grid-cols-3' : mode === 'tablet' ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className={IVORY_PAGE}>
      <PublicTopNav mode={mode} label="Site (search preview)" />

      <div className={`${IVORY_HERO} ${mobile ? 'px-5 pb-6 pt-8' : 'px-10 pb-8 pt-12'}`}>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Greater Cleveland senior living</p>
        <h4 className={`mt-2 max-w-2xl font-serif text-neutral-900 ${mobile ? 'text-3xl' : 'text-5xl'}`}>Find a care home you can trust</h4>
        <p className={`mt-3 max-w-xl text-neutral-700 ${mobile ? 'text-sm' : 'text-base'}`}>
          Licensed homes, state inspection facts, and availability confirmed with the home where we&apos;ve verified it. Free for families.
        </p>
        <form
          role="search"
          onSubmit={(e) => e.preventDefault()}
          className={`mt-6 flex max-w-2xl gap-2 rounded-xl border border-line bg-surface-raised p-2 shadow-card ${mobile ? 'flex-col' : 'items-center'}`}
        >
          <label className="flex flex-1 items-center gap-2 px-2">
            <FiSearch className="h-4 w-4 flex-shrink-0 text-neutral-500" aria-hidden="true" />
            <span className="sr-only">City, ZIP or community name</span>
            <input
              className="w-full border-0 bg-transparent py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-0"
              placeholder="City, ZIP or community name"
            />
          </label>
          <button type="submit" className={BTN_PRIMARY}>Search</button>
        </form>
      </div>

      <div className={mobile ? 'px-5 py-5' : 'px-10 pb-10 pt-6'}>
        {/* Filter chip row — scrolls sideways on phones; the advanced filter panel stays for desktop power users. */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Filters">
          {CHIPS.map((c, i) => (
            <button
              key={c}
              type="button"
              aria-haspopup="dialog"
              className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full border border-neutral-300 bg-surface-raised px-3.5 py-1.5 text-sm font-medium text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 motion-safe:transition-colors"
            >
              {i === CHIPS.length - 1 && <FiSliders className="h-3.5 w-3.5" aria-hidden="true" />}
              {c}
              {i < CHIPS.length - 1 && <FiChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <h5 className="text-lg font-semibold text-neutral-900" data-testid="d-result-count">
            {cards.length} care homes near Cleveland, OH
          </h5>
          {!mobile && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                Sort
                <select className="rounded-lg border-neutral-300 py-1.5 pl-3 pr-8 text-sm text-neutral-800 focus:border-primary-500 focus:ring-primary-500">
                  <option>Best match</option>
                  <option>Recently verified</option>
                </select>
              </label>
              <div className="inline-flex rounded-lg border border-neutral-300 bg-surface-raised p-0.5" role="group" aria-label="Result layout">
                <button type="button" aria-pressed="true" aria-label="Grid" className="rounded-md bg-neutral-900 p-1.5 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  <FiGrid className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" aria-pressed="false" aria-label="List" className="rounded-md p-1.5 text-neutral-700 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  <FiList className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </div>
        <p className="mt-1 text-sm text-neutral-600">Availability and prices show their source and date, or say “contact to confirm”.</p>

        <ul className={`mt-5 grid gap-5 ${cols}`}>
          {cards.map((c) => (
            <li key={c.id} className="flex flex-col">
              <SearchResultCard headingLevel={6}
                home={c}
                href="#"
                saved={saved.has(c.id)}
                comparing={compare.has(c.id)}
                onSave={(id) => setSaved((s) => toggle(s, id))}
                onCompare={(id) => setCompare((s) => toggle(s, id))}
                className="flex-1"
              />
              <StateCaption>{c.state}</StateCaption>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
