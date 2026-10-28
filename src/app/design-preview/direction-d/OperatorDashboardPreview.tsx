'use client';

import { useState } from 'react';
import {
  FiAlertCircle, FiBarChart2, FiCalendar, FiCamera, FiCheckCircle, FiClipboard, FiFileText, FiHome, FiInbox,
  FiMessageSquare, FiSettings, FiShield, FiUsers,
} from 'react-icons/fi';
import SidebarShell, { type SidebarNavItem } from '@/components/layout/SidebarShell';
import NeedsAttentionList, { type NeedsAttentionItem } from '@/components/dashboard/NeedsAttentionList';
import { StatCard } from '@/components/ui/StatCard';
import { BTN_PRIMARY, BTN_SECONDARY, type Mode } from './shared';

const NAV: SidebarNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <FiHome /> },
  { id: 'communities', label: 'Communities', icon: <FiClipboard /> },
  { id: 'inquiries', label: 'Inquiries & Tours', shortLabel: 'Inquiries', icon: <FiInbox />, badge: 6 },
  { id: 'residents', label: 'Residents', icon: <FiUsers /> },
  { id: 'staffing', label: 'Staffing', icon: <FiCalendar /> },
  { id: 'operations', label: 'Operations', icon: <FiShield /> },
  { id: 'reports', label: 'Reports & Insights', icon: <FiBarChart2 /> },
  { id: 'messages', label: 'Messages', icon: <FiMessageSquare />, badge: 2 },
  { id: 'settings', label: 'Settings', icon: <FiSettings /> },
];

// Preview fixtures — every figure is a count the app already stores (inquiries,
// tours, homes, photos, licenses); no occupancy trend or revenue analytics (deferred).
const ATTENTION: NeedsAttentionItem[] = [
  { id: 'late', tone: 'urgent', icon: <FiAlertCircle />, title: '2 inquiries waiting more than 48 hours', detail: 'Oldest: Robert K. for Lakeshore Commons, 3 days', action: { label: 'Reply' } },
  { id: 'tours', tone: 'soon', icon: <FiCalendar />, title: '3 tours this week', detail: 'Next: Thu, Oct 30 · 2:00 PM at Maple Grove', action: { label: 'View schedule' } },
  { id: 'photos', tone: 'neutral', icon: <FiCamera />, title: '2 listings missing photos', detail: 'Families see a “Photos coming soon” placeholder until you add some.', action: { label: 'Add photos' } },
  { id: 'license', tone: 'soon', icon: <FiFileText />, title: 'License renewal: Lakeshore Commons', detail: 'ODH license expires Dec 14, 2026', action: { label: 'View license' } },
];

const PIPELINE = [
  { stage: 'New', count: 9, cls: 'bg-primary-200' },
  { stage: 'Contacted', count: 6, cls: 'bg-primary-300' },
  { stage: 'Tour scheduled', count: 4, cls: 'bg-primary-400' },
  { stage: 'Toured', count: 3, cls: 'bg-primary-600' },
  { stage: 'Placed', count: 1, cls: 'bg-primary-700' },
];

const INQUIRIES = [
  { family: 'Robert K.', community: 'Lakeshore Commons', need: 'Memory care', received: '3 days ago', stage: 'New', overdue: true },
  { family: 'Margaret T.', community: 'Maple Grove', need: 'Assisted living', received: '2 days ago', stage: 'New', overdue: false },
  { family: 'Susan M.', community: 'Maple Grove', need: 'Assisted living', received: 'Yesterday', stage: 'Tour scheduled', overdue: false },
  { family: 'David L.', community: 'Willow Creek', need: 'Memory care', received: 'Oct 22', stage: 'Contacted', overdue: false },
];

function Stage({ stage, overdue }: { stage: string; overdue: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800">{stage}</span>
      {overdue && <span className="rounded-full bg-error-50 px-2 py-0.5 text-xs font-medium text-error-700">Over 48 h</span>}
    </span>
  );
}

/** (iv) Professional — operator dashboard on the navy shell, white workspace. */
export default function OperatorDashboardPreview({ mode }: { mode: Mode }) {
  const [active, setActive] = useState('dashboard');
  const mobile = mode === 'mobile';
  const pad = mobile ? 'px-4' : 'px-8';
  // 5 cards with no empty slot: 5-across on desktop, 2 + 3 on tablet (6-col grid), 2 + 2 + 1 full-width on mobile.
  const statCols = mode === 'desktop' ? 'grid-cols-5' : mode === 'tablet' ? 'grid-cols-6' : 'grid-cols-2';
  const statSpan = (i: number) => (mode === 'tablet' ? (i < 2 ? 'col-span-3' : 'col-span-2') : mode === 'mobile' && i === 4 ? 'col-span-2' : '');
  const total = PIPELINE.reduce((n, p) => n + p.count, 0);

  return (
    <SidebarShell
      tone="navy"
      items={NAV}
      activeId={active}
      onSelect={setActive}
      mobileTabIds={['dashboard', 'inquiries', 'residents', 'messages']}
      user={{ name: 'Dana Whitfield', roleLabel: 'Operator' }}
      viewport={mode}
      embedded
      navLabel="Operator navigation (preview)"
      workspaceClassName="bg-surface-raised"
    >
      <div className={`${pad} space-y-6 py-6`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h4 className={`font-semibold text-neutral-900 ${mobile ? 'text-xl' : 'text-2xl'}`}>Good morning, Dana</h4>
            <p className="mt-0.5 text-sm text-neutral-600">Monday, Oct 27 · 4 communities</p>
          </div>
          <div className="flex gap-2">
            {!mobile && <button type="button" className={BTN_SECONDARY}>View inquiries</button>}
            <button type="button" className={BTN_PRIMARY}>
              <FiCheckCircle className="h-4 w-4" aria-hidden="true" /> Update availability
            </button>
          </div>
        </div>

        <div className={`grid gap-3 ${statCols}`}>
          <StatCard className={statSpan(0)} title="New inquiries" value={6} icon={<FiInbox className="h-4 w-4" />} delta={{ text: '7 days · +2 vs prior 7', tone: 'positive' }} />
          <StatCard className={statSpan(1)} title="Tours this week" value={3} icon={<FiCalendar className="h-4 w-4" />} delta={{ text: '+1 vs last week', tone: 'positive' }} />
          <StatCard className={statSpan(2)} title="Placements" value={1} icon={<FiUsers className="h-4 w-4" />} delta={{ text: '30 days · same as prior 30', tone: 'neutral' }} />
          <StatCard className={statSpan(3)} title="Verified listings" value="1 of 4" icon={<FiCheckCircle className="h-4 w-4" />} delta={{ text: 'Verify weekly to keep the badge', tone: 'neutral' }} />
          <StatCard className={statSpan(4)} title="With photos" value="2 of 4" icon={<FiCamera className="h-4 w-4" />} delta={{ text: '2 show a placeholder', tone: 'neutral' }} />
        </div>

        <div className={mode === 'desktop' ? 'grid grid-cols-5 gap-6' : 'space-y-6'}>
          <NeedsAttentionList items={ATTENTION} headingLevel={5} className={mode === 'desktop' ? 'col-span-3' : ''} />

          <section aria-labelledby="d-op-pipeline" className={`rounded-xl border border-line bg-surface-raised p-5 ${mode === 'desktop' ? 'col-span-2' : ''}`}>
            <h5 id="d-op-pipeline" className="text-base font-semibold text-neutral-900">Inquiry pipeline</h5>
            <p className="text-sm text-neutral-600">Last 30 days · {total} inquiries</p>
            {/* One hue (primary-200 → 700); status colours stay reserved for status. */}
            <div
              className="mt-4 flex h-3 overflow-hidden rounded-full bg-neutral-100"
              role="img"
              aria-label={PIPELINE.map((p) => `${p.stage} ${p.count}`).join(', ')}
            >
              {PIPELINE.map((p) => (
                <span key={p.stage} className={p.cls} style={{ width: `${(p.count / total) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-4 space-y-2">
              {PIPELINE.map((p) => (
                <li key={p.stage} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-neutral-700">
                    <span className={`h-2.5 w-2.5 rounded-sm ${p.cls}`} aria-hidden="true" />
                    {p.stage}
                  </span>
                  <span className="font-semibold tabular-nums text-neutral-900">{p.count}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section aria-labelledby="d-op-recent" className="rounded-xl border border-line bg-surface-raised">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h5 id="d-op-recent" className="text-base font-semibold text-neutral-900">Recent inquiries</h5>
            <a href="#" onClick={(e) => e.preventDefault()} className="rounded-sm text-sm font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              View all
            </a>
          </div>
          {mobile ? (
            <ul className="divide-y divide-neutral-200">
              {INQUIRIES.map((r) => (
                <li key={r.family} className="space-y-1 px-5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-neutral-900">{r.family}</p>
                    <p className="text-xs text-neutral-600">{r.received}</p>
                  </div>
                  <p className="text-sm text-neutral-700">{r.community} · {r.need}</p>
                  <Stage stage={r.stage} overdue={r.overdue} />
                </li>
              ))}
            </ul>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-600">
                <tr>
                  <th scope="col" className="px-5 py-3">Family</th>
                  <th scope="col" className="px-5 py-3">Community</th>
                  <th scope="col" className="px-5 py-3">Care need</th>
                  <th scope="col" className="px-5 py-3">Received</th>
                  <th scope="col" className="px-5 py-3">Stage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {INQUIRIES.map((r) => (
                  <tr key={r.family} className="hover:bg-neutral-50">
                    <td className="px-5 py-3 font-medium text-neutral-900">{r.family}</td>
                    <td className="px-5 py-3 text-neutral-700">{r.community}</td>
                    <td className="px-5 py-3 text-neutral-700">{r.need}</td>
                    <td className="px-5 py-3 text-neutral-700">{r.received}</td>
                    <td className="px-5 py-3"><Stage stage={r.stage} overdue={r.overdue} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </SidebarShell>
  );
}
