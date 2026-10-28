import type { ReactNode } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import EmptyState from '@/components/ui/empty-state';

/**
 * OL-202 — operator "Needs your attention" list (pulled forward from the
 * deferred command center): a short, actionable list that works with thin data.
 * `tone` is status — urgent (overdue), soon (time-bound), info, neutral — and is
 * the only place status colour appears. Not used by any production page yet.
 */
export type NeedsAttentionItem = {
  id: string;
  title: string;
  detail?: string;
  tone: 'urgent' | 'soon' | 'info' | 'neutral';
  icon: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
};

const TONE: Record<NeedsAttentionItem['tone'], { icon: string; label: string }> = {
  urgent: { icon: 'bg-error-50 text-error-700', label: 'Overdue' },
  soon: { icon: 'bg-warning-50 text-warning-800', label: 'Due soon' },
  info: { icon: 'bg-primary-50 text-primary-700', label: 'Info' },
  neutral: { icon: 'bg-neutral-100 text-neutral-700', label: 'To do' },
};

const ACTION =
  'inline-flex flex-shrink-0 items-center rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 active:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 motion-safe:transition-colors';

export default function NeedsAttentionList({
  items,
  title = 'Needs your attention',
  headingLevel = 2,
  className = '',
}: {
  items: NeedsAttentionItem[];
  title?: string;
  /** Heading level for the card title (default 2, a dashboard section). */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as 'h2';
  return (
    <section className={`rounded-xl border border-neutral-200 bg-white ${className}`} aria-labelledby="needs-attention-title">
      <Heading id="needs-attention-title" className="border-b border-neutral-200 px-5 py-4 text-base font-semibold text-neutral-900">
        {title}
      </Heading>
      {items.length === 0 ? (
        <EmptyState icon={FiCheckCircle} title="You're all caught up" description="New inquiries, tours and listing gaps show up here." />
      ) : (
        <ul className="divide-y divide-neutral-200">
          {items.map((it) => {
            const tone = TONE[it.tone];
            return (
              <li key={it.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${tone.icon}`} aria-hidden="true">
                  {it.icon}
                </span>
                <div className="min-w-[12rem] flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    <span className="sr-only">{tone.label}: </span>
                    {it.title}
                  </p>
                  {it.detail && <p className="mt-0.5 text-sm text-neutral-600">{it.detail}</p>}
                </div>
                {it.action &&
                  (it.action.href ? (
                    <a href={it.action.href} className={ACTION}>{it.action.label}</a>
                  ) : (
                    <button type="button" onClick={it.action.onClick} className={ACTION}>{it.action.label}</button>
                  ))}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
