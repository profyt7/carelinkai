import Image from 'next/image';
import Link from 'next/link';
import { CONTACT_PHONE_DISPLAY, CONTACT_PHONE_TEL } from '@/lib/contact';

/**
 * OL-171 — the public site header: the homepage's logo linking to /, the
 * public nav, the published phone number and Log in. Server component with
 * ZERO client JS — the mobile menu is a native <details> disclosure.
 * Used by every public page through SiteShell / PublicShell.
 */

export const SITE_NAV: ReadonlyArray<{ href: string; label: string }> = [
  { href: '/search', label: 'Find care' },
  { href: '/cleveland', label: 'Cleveland' },
  { href: '/concierge', label: 'Family Concierge' },
  { href: '/auth/register?role=operator', label: 'For care homes' },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-sm" data-testid="site-header">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center" aria-label="CareLinkAI home" data-testid="site-logo">
          {/* Lazy, not `priority`/eager: React 19 preloads every non-lazy SSR image, and the logo must
              never compete with the page's LCP text. It is in the first viewport, so it still loads at once. */}
          <Image src="/images/logo.png" alt="CareLinkAI" width={171} height={40} sizes="171px" loading="lazy" className="h-10 w-auto" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
          {SITE_NAV.map((l) => (
            <Link key={l.href} href={l.href} className="font-medium text-neutral-700 transition-colors hover:text-primary-700">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 lg:flex">
          <a href={CONTACT_PHONE_TEL} className="font-semibold text-primary-700 hover:underline" data-testid="header-phone">
            {CONTACT_PHONE_DISPLAY}
          </a>
          <Link href="/auth/login" className="rounded-lg border-2 border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-50">
            Log in
          </Link>
        </div>

        {/* Mobile: phone stays one tap away; the rest sits in a no-JS disclosure. */}
        <div className="flex items-center gap-2 lg:hidden">
          <a href={CONTACT_PHONE_TEL} className="text-sm font-semibold text-primary-700" data-testid="header-phone-mobile">
            {CONTACT_PHONE_DISPLAY}
          </a>
          <details className="group relative">
            <summary
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-md text-neutral-700 hover:bg-neutral-100 [&::-webkit-details-marker]:hidden"
              aria-label="Menu"
            >
              <svg className="h-6 w-6 group-open:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              </svg>
              <svg className="hidden h-6 w-6 group-open:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </summary>
            <nav aria-label="Main (mobile)" className="absolute right-0 top-12 w-64 rounded-xl border border-neutral-200 bg-white p-2 shadow-xl">
              {SITE_NAV.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-3 font-medium text-neutral-800 hover:bg-primary-50 hover:text-primary-700">
                  {l.label}
                </Link>
              ))}
              <Link href="/auth/login" className="mt-1 block rounded-lg border-2 border-primary-600 px-3 py-2.5 text-center font-semibold text-primary-700">
                Log in
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
