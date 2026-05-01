import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getGuide, GUIDES } from '../content';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = getGuide(params.slug);
  if (!guide) return {};
  return {
    title: `${guide.title} | CareLinkAI`,
    description: guide.description,
  };
}

export default async function GuidePage({ params }: Props) {
  const guide = getGuide(params.slug);
  if (!guide) notFound();

  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  const content = (
    <div className={isLoggedIn ? '' : 'min-h-screen bg-neutral-50'}>
      {/* Header */}
      <div className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 mb-6"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all guides
          </Link>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
              {guide.category}
            </span>
            <span className="text-xs text-neutral-400">{guide.readTime}</span>
          </div>

          <h1 className="text-3xl font-bold text-neutral-900 mb-4">
            {guide.icon} {guide.title}
          </h1>

          <p className="text-lg text-neutral-600 leading-relaxed">{guide.intro}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-10">
          {guide.sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-xl font-semibold text-neutral-900 mb-3">{section.heading}</h2>
              <p className="text-neutral-700 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary-50 border border-primary-200 rounded-xl">
          <p className="text-sm text-primary-700 font-medium mb-3">Ready to take the next step?</p>
          <Link
            href={guide.cta.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            {guide.cta.text}
          </Link>
        </div>

        {/* Related guides */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">More guides</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {GUIDES.filter((g) => g.slug !== guide.slug)
              .slice(0, 4)
              .map((related) => (
                <Link
                  key={related.slug}
                  href={`/learn/guides/${related.slug}`}
                  className="group p-4 bg-white border border-neutral-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all"
                >
                  <span className="text-2xl mb-2 block">{related.icon}</span>
                  <p className="text-sm font-medium text-neutral-900 group-hover:text-primary-700">
                    {related.title}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">{related.readTime}</p>
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoggedIn) {
    return <DashboardLayout title={guide.title} showSearch={false}>{content}</DashboardLayout>;
  }
  return content;
}
