'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Client-side HIPAA BAA/DPA acceptance gate for operator pages.
 * ADMIN sessions bypass the gate. Acceptance page itself is excluded to
 * prevent infinite redirect loops.
 */
export function AcceptanceGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isAcceptancePage = pathname?.startsWith('/legal/acceptance');

  useEffect(() => {
    if (status === 'loading') return;
    if (isAcceptancePage) {
      setChecked(true);
      return;
    }
    if (!session?.user) {
      router.push('/auth/login');
      return;
    }
    // ADMIN accounts bypass the gate
    if (session.user.role === 'ADMIN') {
      setChecked(true);
      return;
    }

    fetch('/api/acceptance')
      .then((r) => r.json())
      .then((data: { current?: boolean; bypass?: boolean }) => {
        if (data.current) {
          setChecked(true);
        } else {
          router.push('/legal/acceptance');
        }
      })
      .catch(() => {
        // On network error, allow through — API routes have their own auth
        setChecked(true);
      });
  }, [status, session, pathname, isAcceptancePage, router]);

  if (!checked && !isAcceptancePage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-500 text-sm">Checking compliance requirements…</div>
      </div>
    );
  }

  return <>{children}</>;
}
