import Image from 'next/image';
import Link from 'next/link';
import { CONTACT_FOOTER_LINE, CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/lib/contact';
import { SUBURBS, suburbPath } from '@/lib/directory/suburbs';

/**
 * OL-171 — the public site footer (dark, like the homepage footer). Server
 * component, no client JS. Directory links, families, care homes, contact.
 * Copy rules: no "AI" pitch, no outcome / savings promises, no facility fee.
 */

const COLUMNS: ReadonlyArray<{ title: string; links: ReadonlyArray<{ href: string; label: string }> }> = [
  {
    title: 'Find care in Cleveland',
    links: [
      { href: '/cleveland/assisted-living', label: 'Assisted living' },
      { href: '/cleveland/memory-care', label: 'Memory care' },
      { href: '/cleveland/independent-living', label: 'Independent living' },
      { href: '/cleveland/nursing-homes', label: 'Nursing homes' },
      { href: '/cleveland/home-care-agencies', label: 'Home care agencies' },
    ],
  },
  {
    title: 'Families',
    links: [
      { href: '/search', label: 'Search the directory' },
      { href: '/concierge', label: 'Family Concierge' },
      { href: '/learn', label: 'Guides' },
      { href: '/contact', label: 'Contact us' },
    ],
  },
  {
    title: 'Care homes',
    links: [
      { href: '/auth/register?role=operator', label: 'List or claim your home' },
      { href: '/auth/login', label: 'Log in' },
    ],
  },
];

export default function SiteFooter() {
  return (
    <footer className="bg-neutral-900 text-neutral-300" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Image src="/images/logo.png" alt="CareLinkAI" width={171} height={40} sizes="171px" className="h-10 w-auto brightness-0 invert" />
            <p className="mt-4 max-w-sm text-sm text-neutral-300">
              A Greater Cleveland senior-care directory. Licensed homes, state inspection facts, and open beds confirmed with the home. Free for families.
            </p>
            <p className="mt-4 text-sm">
              <a href={CONTACT_PHONE_TEL} className="font-semibold text-white hover:underline" data-testid="footer-phone">
                Call {CONTACT_PHONE_DISPLAY}
              </a>
              {' '}<span className="text-neutral-400" data-testid="footer-phone-line">{CONTACT_FOOTER_LINE}</span>
            </p>
          </div>
          {COLUMNS.map((c) => (
            <div key={c.title}>
              <h2 className="text-sm font-bold text-white">{c.title}</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-neutral-800 pt-6 text-sm">
          <p className="text-neutral-400">
            Assisted living by suburb:{' '}
            {SUBURBS.map((s, i) => (
              <span key={s.slug}>
                {i > 0 && ' · '}
                <Link href={suburbPath(s)} className="hover:text-white">
                  {s.name}
                </Link>
              </span>
            ))}
          </p>
          <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-neutral-400">
            <span>© {new Date().getFullYear()} CareLinkAI · Cleveland, Ohio</span>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <span>Not a licensed care provider, broker or insurer.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
