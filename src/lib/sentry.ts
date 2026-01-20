// Sentry utilities for manual error reporting and context management
import * as Sentry from '@sentry/nextjs';

/**
 * Check if Sentry is properly initialized
 */
export function isSentryInitialized(): boolean {
  try {
    const client = Sentry.getClient();
    return !!client;
  } catch {
    return false;
  }
}

/**
 * Manually capture an error with optional context
 */
export function captureError(
  error: Error | string,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: { id?: string; email?: string; name?: string };
    level?: Sentry.SeverityLevel;
  }
) {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  Sentry.withScope((scope) => {
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    if (context?.level) {
      scope.setLevel(context.level);
    }
    
    Sentry.captureException(errorObj);
  });
  
  // Also log to console for development visibility
  console.error('[Sentry] Error captured:', errorObj.message, context);
}

/**
 * Capture a message (for non-error events)
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}

/**
 * Set user context for all subsequent events
 */
export function setUser(user: { id?: string; email?: string; name?: string } | null) {
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for better error context
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  data?: Record<string, unknown>,
  level?: Sentry.SeverityLevel
) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    data,
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a performance transaction
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Wrap an async function with Sentry error handling
 */
export async function withSentry<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: Record<string, unknown>
): Promise<T> {
  addBreadcrumb(`Starting: ${operation}`, 'operation');
  
  try {
    const result = await fn();
    addBreadcrumb(`Completed: ${operation}`, 'operation', { success: true });
    return result;
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), {
      tags: { operation },
      extra: context,
    });
    throw error;
  }
}

/**
 * Test Sentry integration by sending a test error
 */
export function testSentry(): { initialized: boolean; testSent: boolean } {
  const initialized = isSentryInitialized();
  
  if (initialized) {
    captureError(new Error('Sentry Test Error - ' + new Date().toISOString()), {
      tags: { test: 'true', source: 'testSentry' },
      level: 'info',
    });
  }
  
  return {
    initialized,
    testSent: initialized,
  };
}

export { Sentry };
