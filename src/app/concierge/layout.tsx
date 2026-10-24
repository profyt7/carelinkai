import SiteShell from '@/components/site/SiteShell';

/** OL-171 — /concierge (and /concierge/thanks) share the public site header + footer. */
export default function ConciergeLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell>{children}</SiteShell>;
}
