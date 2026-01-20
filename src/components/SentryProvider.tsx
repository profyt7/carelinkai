'use client';

import React, { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useSession } from 'next-auth/react';

interface SentryProviderProps {
  children: React.ReactNode;
}

export default function SentryProvider({ children }: SentryProviderProps) {
  const { data: session } = useSession() || {};
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Set user context when session changes
    if (session?.user) {
      Sentry.setUser({
        id: session.user.id || undefined,
        email: session.user.email || undefined,
        username: session.user.name || undefined,
      });
    } else {
      Sentry.setUser(null);
    }
    
    setIsReady(true);
  }, [session]);

  // Always render children - Sentry error boundary handles errors
  return <>{children}</>;
}

// Export a hook to check Sentry status
export function useSentryStatus() {
  const [status, setStatus] = useState({
    initialized: false,
  });

  useEffect(() => {
    try {
      const client = Sentry.getClient();
      setStatus({
        initialized: !!client,
      });
    } catch {
      setStatus({ initialized: false });
    }
  }, []);

  return status;
}
