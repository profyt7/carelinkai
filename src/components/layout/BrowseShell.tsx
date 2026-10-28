'use client';

import { useSession } from 'next-auth/react';
import DashboardLayout from './DashboardLayout';
import PublicShell from './PublicShell';

/**
 * Session-aware shell for the publicly-browsable pages (/search, /homes/[id]).
 *  - authenticated  → the full member DashboardLayout (members keep their nav)
 *  - anonymous/loading → the minimal PublicShell (no auth redirect — logged-out
 *    families can browse + inquire; signup is triggered only at inquiry/save)
 *
 * This replaces wrapping these pages directly in DashboardLayout, which redirected
 * anonymous visitors to /auth/login (a login wall on what should be public).
 */
export default function BrowseShell({
  title,
  showSearch,
  children,
}: {
  title?: string;
  showSearch?: boolean;
  children: React.ReactNode;
}) {
  const { status } = useSession();
  if (status === 'authenticated') {
    return (
      <DashboardLayout title={title ?? ''} showSearch={showSearch}>
        {children}
      </DashboardLayout>
    );
  }
  return <PublicShell>{children}</PublicShell>;
}
