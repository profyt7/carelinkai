'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Client-side gate for operator pages.
 * Order of checks:
 *   1. Onboarding — new operators are redirected to /operator/onboarding/1
 *   2. HIPAA BAA/DPA acceptance — operators must accept before using the app
 * ADMIN sessions bypass both gates.
 */
export function AcceptanceGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isAcceptancePage = pathname?.startsWith('/legal/acceptance');
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
    if ((session.user as any).role === 'ADMIN') {
      setChecked(true);
      return;
    }
    // Only OPERATOR accounts need the onboarding + acceptance checks
    if ((session.user as any).role !== 'OPERATOR') {
      setChecked(true);
      return;
    }

    // Step 1: Check onboarding completion
    fetch('/api/operator/onboarding/status')
      .then((r) => r.json())
      .then((data: { completed?: boolean }) => {
        if (!data.completed) {
          router.push('/operator/onboarding/1');
          return;
        }
        // Step 2: Check BAA/DPA acceptance
        return fetch('/api/acceptance')
          .then((r) => r.json())
          .then((acceptData: { current?: boolean }) => {
            if (acceptData.current) {
              setChecked(true);
            } else {
              router.push('/legal/acceptance');
            }
          });
      })
      .catch(() => {
        // On network error, allow through — API routes have their own auth
        setChecked(true);
      });
  }, [status, session, pathname, isAcceptancePage, isOnboardingPage, router]);

  if (!checked && !isAcceptancePage && !isOnboardingPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Checking compliance requirements…</div>
      </div>
    );
  }

  return <>{children}</>;
}
