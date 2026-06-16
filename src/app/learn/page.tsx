import Link from 'next/link';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { GUIDES } from './guides/content';
import {
  HOWTO_GUIDES,
  AUDIENCE_LABELS,
  AUDIENCE_ORDER,
  type HowToAudience,
  type HowToGuide,
} from './howto/content';
import { filterGuidesForRole, type ViewerRole } from '@/lib/howto/access';

export const metadata: Metadata = {
  title: 'Family Education Hub | CareLinkAI',
  description:
    'Free guides and resources to help families find the right assisted living home, understand care costs, and navigate senior care with confidence.',
};


type EduTab = 'howto' | 'guides';

export default async function LearnPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;
  const role = (session?.user?.role as ViewerRole) ?? null;

  // Tabs separate the product How-To tutorials from the growing library of
  // senior-care articles, so neither buries the other. Default to How-To
  // (the onboarding content). Persisted in the URL so links/refresh are stable.
  const activeTab: EduTab = searchParams?.tab === 'guides' ? 'guides' : 'howto';

  // Role-gated How-To guides, grouped by audience for display. Each guide can
  // belong to more than one audience; show it under the first matching group
  // in display order so it appears once.
  const visibleHowTo = filterGuidesForRole(HOWTO_GUIDES, role);
  const shownSlugs = new Set<string>();
  const howToByAudience: Array<{ audience: HowToAudience; guides: HowToGuide[] }> = [];
  for (const audience of AUDIENCE_ORDER) {
    const guides = visibleHowTo.filter(
      (g) => g.audiences.includes(audience) && !shownSlugs.has(g.slug)
    );
    guides.forEach((g) => shownSlugs.add(g.slug));
    if (guides.length > 0) howToByAudience.push({ audience, guides });
  }

  const content = (
    <div className={isLoggedIn ? '' : 'min-h-screen bg-neutral-50'}>
      {/* Hero */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium mb-4">
            Free Family Resources
          </div>
          <h1 className="text-4xl font-bold text-neutral-900 mb-4">
            The CareLinkAI Family Education Hub
          </h1>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Honest, practical guides to help Cleveland-area families navigate senior care — from first conversations to move-in day.
          </p>
        </div>
      </div>

      {/* Tabs — separate How-To tutorials from senior-care articles. Driven by
          the ?tab= query param so they're one click away, URL-stable, and
          neither section buries the other as articles grow. */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Education Hub sections">
            <Link
              href="/learn?tab=howto"
              aria-current={activeTab === 'howto' ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === 'howto'
                  ? 'border-primary-600 font-semibold text-primary-700'
                  : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
              }`}
            >
              How-To &amp; Tutorials
              <span className="ml-1.5 text-xs text-neutral-400">{visibleHowTo.length}</span>
            </Link>
            <Link
              href="/learn?tab=guides"
              aria-current={activeTab === 'guides' ? 'page' : undefined}
              className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
                activeTab === 'guides'
                  ? 'border-primary-600 font-semibold text-primary-700'
                  : 'border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
              }`}
            >
              Senior Care Guides
              <span className="ml-1.5 text-xs text-neutral-400">{GUIDES.length}</span>
            </Link>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* TAB: How-To & Tutorials (role-gated) */}
        {activeTab === 'howto' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-neutral-900">How-To &amp; Tutorials</h2>
              <p className="text-neutral-600 mt-1">
                Step-by-step help for getting the most out of CareLinkAI.
              </p>
            </div>

            {howToByAudience.length === 0 ? (
              <p className="text-neutral-500">No tutorials available yet — check back soon.</p>
            ) : (
              howToByAudience.map(({ audience, guides }) => (
                <div key={audience} className="mb-10">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500 mb-4">
                    {AUDIENCE_LABELS[audience]}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {guides.map((guide) => (
                      <Link
                        key={guide.slug}
                        href={`/learn/howto/${guide.slug}`}
                        className="group bg-white rounded-xl border border-neutral-200 p-5 hover:border-primary-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{guide.icon}</span>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs text-neutral-400">{guide.readTime}</span>
                            </div>
                            <h4 className="font-semibold text-neutral-900 mb-1 group-hover:text-primary-700 transition-colors">
                              {guide.title}
                            </h4>
                            <p className="text-sm text-neutral-500 leading-relaxed">{guide.summary}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB: Senior Care Guides (articles) */}
        {activeTab === 'guides' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/learn/guides/${guide.slug}`}
                className="group bg-white rounded-xl border border-neutral-200 p-6 hover:border-primary-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{guide.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        {guide.category}
                      </span>
                      <span className="text-xs text-neutral-400">{guide.readTime}</span>
                    </div>
                    <h2 className="font-semibold text-neutral-900 mb-2 group-hover:text-primary-700 transition-colors">
                      {guide.title}
                    </h2>
                    <p className="text-sm text-neutral-500 leading-relaxed">{guide.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Financing CTA */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="text-2xl">💳</div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-900">Need help affording care?</p>
            <p className="text-sm text-neutral-600">CareLinkAI has partnered with CareCredit — a healthcare credit card accepted at thousands of senior care providers. Apply in minutes, decisions are fast.</p>
          </div>
          <a
            href="https://www.carecredit.com/apply/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
          >
            Apply for CareCredit →
          </a>
        </div>

        {/* Lead magnet CTA */}
        <div className="mt-8 bg-primary-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Ready to Find a Home?</h2>
          <p className="text-primary-100 mb-6">
            Browse {GUIDES.length} free guides, then search homes near you — no email required.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
          >
            Start Your Home Search
          </Link>
          <p className="text-primary-200 text-sm mt-3">No email required to search</p>
        </div>
      </div>
    </div>
  );

  if (isLoggedIn) {
    return <DashboardLayout title="Education Hub" showSearch={false}>{content}</DashboardLayout>;
  }
  return content;
}
