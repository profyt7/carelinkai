import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getHowToGuide, HOWTO_GUIDES, AUDIENCE_LABELS, AVAILABLE_HOWTO_IMAGES, type HowToStep } from '../content';
import { canViewGuide, filterGuidesForRole, type ViewerRole } from '@/lib/howto/access';
import HowToImage from '../HowToImage';

/** Group consecutive steps under their optional section heading. */
function groupSteps(steps: HowToStep[]): { section?: string; steps: HowToStep[] }[] {
  const groups: { section?: string; steps: HowToStep[] }[] = [];
  for (const step of steps) {
    if (step.section || groups.length === 0) {
      groups.push({ section: step.section, steps: [step] });
    } else {
      groups[groups.length - 1].steps.push(step);
    }
  }
  return groups;
}

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getHowToGuide(params.slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | How-To Guides | CareLinkAI`,
    description: guide.summary,
  };
}

export default async function HowToGuidePage({ params }: Props) {
  const guide = getHowToGuide(params.slug);
  if (!guide) notFound();

  const session = await getServerSession(authOptions);
  const role = (session?.user?.role as ViewerRole) ?? null;

  // Role-gate: if the viewer is not allowed to see this guide, send them back
  // to the hub rather than exposing role-specific content.
  if (!canViewGuide(guide, role)) {
    redirect('/learn');
  }

  const related = filterGuidesForRole(
    HOWTO_GUIDES.filter((g) => g.slug !== guide.slug),
    role
  ).slice(0, 4);

  const isLoggedIn = !!session?.user;

  const content = (
    <div className={isLoggedIn ? '' : 'min-h-screen bg-neutral-50'}>
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to the Education Hub
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {guide.audiences.map((a) => (
              <span
                key={a}
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600"
              >
                {AUDIENCE_LABELS[a]}
              </span>
            ))}
            <span className="text-xs text-neutral-400">{guide.readTime}</span>
          </div>

          <h1 className="text-3xl font-bold text-neutral-900 mb-3">
            {guide.icon} {guide.title}
          </h1>

          <p className="text-sm text-neutral-500 mb-4">
            <span className="font-medium text-neutral-700">Who it&apos;s for: </span>
            {guide.whoFor}
          </p>

          <div className="rounded-xl bg-primary-50 border border-primary-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-700 mb-1">
              30-second summary
            </p>
            <p className="text-neutral-700 leading-relaxed">{guide.summary}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Steps — grouped under their optional section headings, numbered
            within each group. */}
        <div className="space-y-8">
          {groupSteps(guide.steps).map((group, gi) => (
            <div key={gi}>
              {group.section && (
                <h2 className="text-lg font-semibold text-neutral-900 mb-4">{group.section}</h2>
              )}
              <ol className="space-y-5">
                {group.steps.map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-semibold">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-neutral-800 leading-relaxed">{step.text}</p>
                      {step.image && AVAILABLE_HOWTO_IMAGES.has(step.image) && (
                        <HowToImage image={step.image} alt={step.imageAlt} />
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        {/* Tips */}
        {guide.tips && guide.tips.length > 0 && (
          <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-sm font-semibold text-amber-800 mb-2">💡 Tips</h2>
            <ul className="list-disc list-inside space-y-1 text-sm text-neutral-700">
              {guide.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        {/* FAQ */}
        {guide.faq && guide.faq.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">FAQ</h2>
            <div className="space-y-4">
              {guide.faq.map((item, i) => (
                <div key={i}>
                  <p className="font-medium text-neutral-900">{item.q}</p>
                  <p className="text-sm text-neutral-600 mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Screenshots — only renders images actually present under
            public/howto (text-first; missing captures render nothing, never a
            broken link). See AVAILABLE_HOWTO_IMAGES. */}
        {(() => {
          const present = (guide.images ?? []).filter((img) => AVAILABLE_HOWTO_IMAGES.has(img));
          if (present.length === 0) return null;
          return (
            <div className="mt-10">
              <h2 className="text-lg font-semibold text-neutral-900 mb-4">Screenshots</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {present.map((img) => (
                  <HowToImage key={img} image={img} alt={`${guide.title} screenshot`} />
                ))}
              </div>
            </div>
          );
        })()}

        {/* NOTE: narrationScript is intentionally NOT rendered — it is internal
            video voiceover content, not for end users. */}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">More how-to guides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {related.map((g) => (
                <Link
                  key={g.slug}
                  href={`/learn/howto/${g.slug}`}
                  className="group p-4 bg-white border border-neutral-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl mb-2 block">{g.icon}</span>
                  <p className="text-sm font-medium text-neutral-900 group-hover:text-primary-700">
                    {g.title}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">{g.readTime}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (isLoggedIn) {
    return <DashboardLayout title={guide.title} showSearch={false}>{content}</DashboardLayout>;
  }
  return content;
}
