import type { Faq } from '@/lib/seo/directory-faq';
import { buildFaqPageJsonLd } from '@/lib/seo/jsonld';

/**
 * OL-172 (c) — visible FAQ + FAQPage JSON-LD from the same array, so the
 * structured data always matches what is on the page. Server component, no JS.
 */
export default function FaqSection({ faqs, title = 'Common questions', testId = 'faq-section' }: { faqs: readonly Faq[]; title?: string; testId?: string }) {
  if (faqs.length === 0) return null;
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16" data-testid={testId}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqPageJsonLd(faqs)) }} />
      <h2 className="text-3xl font-bold text-neutral-900">{title}</h2>
      <dl className="mt-8 space-y-6">
        {faqs.map((f) => (
          <div key={f.q} className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm" data-testid="faq-item">
            <dt className="text-lg font-semibold text-neutral-900">{f.q}</dt>
            <dd className="mt-2 text-neutral-700">{f.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
