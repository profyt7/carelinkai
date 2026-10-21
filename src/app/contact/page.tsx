import type { Metadata } from 'next';
import Link from 'next/link';
import { FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import { CONTACT_HOURS_LINE, CONTACT_NO_PHI_LINE, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/lib/contact';

/**
 * /contact — the published phone line, hours and the secure path for anything
 * that involves a patient (OL-167d). Public, no form (nothing to store here).
 */

export const metadata: Metadata = {
  title: `Contact CareLinkAI — ${CONTACT_PHONE_DISPLAY} | Cleveland senior care directory`,
  description: `Call ${CONTACT_PHONE_DISPLAY}. Our front desk answers around the clock and a person calls you back. Families, discharge planners and communities in Greater Cleveland.`,
  alternates: { canonical: 'https://getcarelinkai.com/contact' },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-neutral-50" data-testid="contact-page">
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">Contact · Greater Cleveland</p>
          <h1 className="mt-3 text-4xl font-bold text-neutral-900">Call us</h1>
          <a
            href={CONTACT_PHONE_TEL}
            data-testid="contact-phone"
            className="mt-6 inline-flex items-center gap-3 rounded-xl bg-primary-600 px-6 py-4 text-2xl font-bold text-white hover:bg-primary-700"
          >
            <FiPhone /> {CONTACT_PHONE_DISPLAY}
          </a>
          <p className="mt-4 text-neutral-700 max-w-2xl">{CONTACT_HOURS_LINE}</p>
          <p className="mt-2 text-sm text-neutral-600 max-w-2xl">{CONTACT_NO_PHI_LINE}</p>
        </div>
      </section>
      <section className="max-w-3xl mx-auto px-6 py-12 grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><FiMail className="text-primary-600" /> Email</h2>
          <p className="mt-2 text-sm text-neutral-700">
            <a href="mailto:support@getcarelinkai.com" className="text-primary-700 hover:underline">support@getcarelinkai.com</a>
          </p>
          <p className="mt-2 text-xs text-neutral-500">For anything about a specific person needing care, use the secure request instead of email.</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="font-semibold text-neutral-900 flex items-center gap-2"><FiMapPin className="text-primary-600" /> Cleveland, Ohio</h2>
          <p className="mt-2 text-sm text-neutral-700">Founder-run from Cleveland. Serving Cuyahoga, Summit, Lake, Lorain, Medina, Geauga and Portage counties.</p>
        </div>
        <div className="sm:col-span-2 rounded-2xl border border-primary-200 bg-primary-50 p-6">
          <h2 className="font-semibold text-neutral-900">Need help placing someone?</h2>
          <p className="mt-2 text-sm text-neutral-700">
            Families and discharge planners: start at the{' '}
            <Link href="/concierge" className="font-semibold text-primary-700 hover:underline">secure concierge request</Link>{' '}
            or browse the{' '}
            <Link href="/cleveland" className="font-semibold text-primary-700 hover:underline">Cleveland directory</Link>. Free for families; Medicaid, Medicare and VA families always get our help free.
          </p>
        </div>
      </section>
    </main>
  );
}
