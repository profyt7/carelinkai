'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

/**
 * Logout route. Some flows navigate here directly (e.g. settings → "log out of all
 * devices", or a stale /auth/logout link/bookmark) — previously a 404. Signs the
 * user out via NextAuth and returns them to the login page.
 */
export default function LogoutPage() {
  useEffect(() => {
    signOut({ callbackUrl: '/auth/login' });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-500">
      Signing you out…
    </div>
  );
}
