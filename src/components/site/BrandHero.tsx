import Link from 'next/link';
import { EYEBROW, HERO_BAND } from './brand';

/**
 * OL-171 — branded hero band for hub, care-type, suburb and concierge pages:
 * a soft tint of the brand gradient with a thin full-strength gradient rule
 * on top, breadcrumbs, eyebrow, H1, intro and a CTA row. Server component.
 */
export type Crumb = { href?: string; label: string };

export default function BrandHero({
  crumbs,
  eyebrow,
  title,
  intro,
  children,
  testId = 'brand-hero',
}: {
  crumbs?: Crumb[];
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  intro?: React.ReactNode;
  children?: React.ReactNode;
  testId?: string;
}) {
  return (
    <section className={HERO_BAND} data-testid={testId}>
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-secondary-500 opacity-10 blur-3xl" />
      <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="text-sm text-neutral-600">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {crumbs.map((c, i) => (
                <li key={`${c.label}-${i}`} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true" className="text-neutral-400">/</span>}
                  {c.href ? (
                    <Link href={c.href} className="hover:text-primary-700 hover:underline">
                      {c.label}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-medium text-neutral-900">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className={`mt-4 ${EYEBROW}`}>{eyebrow}</p>}
        <h1 className="mt-3 text-4xl font-bold leading-tight text-neutral-900 sm:text-5xl">{title}</h1>
        {intro && <div className="mt-5 max-w-3xl text-lg text-neutral-700">{intro}</div>}
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}
