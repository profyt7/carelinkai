'use client';

import Link from 'next/link';

/**
 * Minimal public chrome for ANONYMOUS (logged-out) visitors browsing the directory
 * (/search, /homes/[id]). No member sidebar, no useSession redirect — logged-out families
 * can search, browse, view listings, and submit an inquiry; signup is only triggered at
 * inquiry/save, never as a wall. Authenticated users get the full DashboardLayout instead
 * (see BrowseShell).
 */
export default function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-teal-700">
            CareLinkAI
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm font-medium text-neutral-700 hover:text-teal-700">
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-xs text-neutral-500">
          CareLinkAI · Greater Cleveland senior-care directory ·{' '}
          <Link href="/privacy" className="underline hover:text-neutral-700">Privacy</Link> ·{' '}
          <Link href="/terms" className="underline hover:text-neutral-700">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
