'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Client-side gate for operator pages: new operators without onboardingCompletedAt are sent to
 * /operator/onboarding/1. ADMIN sessions bypass it.
 *
 * The HIPAA BAA/DPA is NOT asked for here: an operator who has only claimed or edited a listing
 * never touches PHI. It is required server-side at the first PHI route, alongside the 2FA
 * step-up (src/lib/auth/phi-agreement.ts, src/middleware.ts).
 */
export function AcceptanceGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isAcceptancePage = pathname?.startsWith('/operator/acceptance');
  const isOnboardingPage = pathname?.startsWith('/operator/onboarding');

  useEffect(() => {
    if (status === 'loading') return;
    if (isAcceptancePage || isOnboardingPage) {
      setChecked(true);
      return;
    }
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    // ADMIN accounts bypass all gates
    if (session.user.role === 'ADMIN') {
      setChecked(true);
      return;
    }
    // Only OPERATOR accounts need these checks
    if (session.user.role !== 'OPERATOR') {
      setChecked(true);
      return;
    }

    // Onboarding completion for new operators
    fetch('/api/operator/onboarding/status')
      .then((r) => r.json())
      .then((data: { completed?: boolean }) => {
        if (!data.completed) {
          router.push('/operator/onboarding/1');
          return;
        }
        setChecked(true);
      })
      .catch(() => {
        // On network error, allow through — API routes have their own auth
        setChecked(true);
      });
  }, [status, session, pathname, isAcceptancePage, isOnboardingPage, router]);

  if (!checked && !isAcceptancePage && !isOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
