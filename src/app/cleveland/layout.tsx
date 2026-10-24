import SiteShell from '@/components/site/SiteShell';

/** OL-171 — /cleveland and every /cleveland/* page share the public site header + footer. */
export default function ClevelandLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
