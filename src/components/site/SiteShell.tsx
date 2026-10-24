import SiteFooter from './SiteFooter';
import SiteHeader from './SiteHeader';

/**
 * OL-171 — the shared public layout: SiteHeader, the page, SiteFooter.
 * Server component (no client JS). The root layout already wraps every page
 * in <main id="main-content">, so pages under this shell use a <div> as their
 * outer element — never a second <main>.
 */
export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50" data-testid="site-shell">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
