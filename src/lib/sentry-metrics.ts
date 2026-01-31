/**
 * Sentry Metrics Utilities
 * 
 * This module provides convenient wrappers for Sentry metrics tracking.
 * Metrics help track application health, performance, and business metrics.
 * 
 * Learn more: https://docs.sentry.io/platforms/javascript/guides/nextjs/metrics/
 * 
 * @example
 * // Track API calls
 * trackApiCall('/api/homes', 'GET', 200);
 * 
 * // Track database queries
 * trackDatabaseQuery('SELECT', 'homes', 45.2);
 * 
 * // Track business events
 * trackBusinessEvent('inquiry.created', { plan: 'premium' });
 */

import * as Sentry from '@sentry/nextjs';

/**
 * Check if Sentry metrics are available
 */
export function isMetricsEnabled(): boolean {
  try {
    const client = Sentry.getClient();
    return !!client;
  } catch {
    return false;
  }
}

/**
 * Track API endpoint calls
 * 
 * @param endpoint - API endpoint path
 * @param method - HTTP method
 * @param statusCode - HTTP status code
 * @param responseTime - Response time in milliseconds (optional)
 */
export function trackApiCall(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime?: number
) {
  if (!isMetricsEnabled()) return;

  try {
    // Count API calls
    Sentry.metrics.count('api.call', 1, {
      attributes: {
        endpoint,
        method,
        status_code: statusCode.toString(),
        status_category: statusCode >= 500 ? 'server_error' : 
                        statusCode >= 400 ? 'client_error' : 
                        statusCode >= 300 ? 'redirect' : 
                        statusCode >= 200 ? 'success' : 'info',
      },
    });

    // Track response time if provided
    if (responseTime !== undefined) {
      Sentry.metrics.distribution('api.response_time', responseTime, {
        unit: 'millisecond',
        attributes: {
          endpoint,
          method,
        },
      });
    }
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking API call:', error);
  }
}

/**
 * Track database query performance
 * 
 * @param operation - SQL operation (SELECT, INSERT, UPDATE, DELETE)
 * @param table - Database table name
 * @param duration - Query duration in milliseconds
 */
export function trackDatabaseQuery(
  operation: string,
  table: string,
  duration: number
) {
  if (!isMetricsEnabled()) return;

  try {
    Sentry.metrics.distribution('database.query_time', duration, {
      unit: 'millisecond',
      attributes: {
        operation,
        table,
      },
    });

    // Count queries
    Sentry.metrics.count('database.query', 1, {
      attributes: {
        operation,
        table,
      },
    });
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking database query:', error);
  }
}

/**
 * Track business events (e.g., inquiries, bookings, registrations)
 * 
 * @param eventName - Name of the business event
 * @param attributes - Additional attributes for filtering/grouping
 */
export function trackBusinessEvent(
  eventName: string,
  attributes?: Record<string, string | number | boolean>
) {
  if (!isMetricsEnabled()) return;

  try {
    Sentry.metrics.count(eventName, 1, {
      attributes: attributes as Record<string, string>,
    });
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking business event:', error);
  }
}

/**
 * Track user authentication events
 * 
 * @param action - Authentication action (login, logout, register, failed_login)
 * @param role - User role
 */
export function trackAuthEvent(action: 'login' | 'logout' | 'register' | 'failed_login', role?: string) {
  if (!isMetricsEnabled()) return;

  try {
    Sentry.metrics.count('auth.event', 1, {
      attributes: {
        action,
        ...(role && { role }),
      },
    });
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking auth event:', error);
  }
}

/**
 * Track page views
 * 
 * @param path - Page path
 * @param loadTime - Page load time in milliseconds (optional)
 */
export function trackPageView(path: string, loadTime?: number) {
  if (!isMetricsEnabled()) return;

  try {
    // Count page views
    Sentry.metrics.count('page.view', 1, {
      attributes: {
        path,
      },
    });

    // Track page load time if provided
    if (loadTime !== undefined) {
      Sentry.metrics.distribution('page.load_time', loadTime, {
        unit: 'millisecond',
        attributes: {
          path,
        },
      });
    }
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking page view:', error);
  }
}

/**
 * Track application memory usage
 * 
 * @param memoryMB - Memory usage in megabytes
 * @param type - Type of memory (heap, rss, external)
 */
export function trackMemoryUsage(memoryMB: number, type: 'heap' | 'rss' | 'external' = 'heap') {
  if (!isMetricsEnabled()) return;

  try {
    Sentry.metrics.gauge('app.memory_usage', memoryMB, {
      unit: 'megabyte',
      attributes: {
        type,
      },
    });
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking memory usage:', error);
  }
}

/**
 * Track active connections/sessions
 * 
 * @param count - Number of active connections
 * @param type - Connection type (http, websocket, database)
 */
export function trackActiveConnections(count: number, type: 'http' | 'websocket' | 'database') {
  if (!isMetricsEnabled()) return;

  try {
    Sentry.metrics.gauge('app.active_connections', count, {
      attributes: {
        type,
      },
    });
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking active connections:', error);
  }
}

/**
 * Track search queries
 * 
 * @param searchType - Type of search (homes, caregivers, residents)
 * @param resultsCount - Number of results returned
 * @param queryTime - Query execution time in milliseconds
 */
export function trackSearch(
  searchType: string,
  resultsCount: number,
  queryTime?: number
) {
  if (!isMetricsEnabled()) return;

  try {
    // Count searches
    Sentry.metrics.count('search.query', 1, {
      attributes: {
        type: searchType,
      },
    });

    // Track results count
    Sentry.metrics.gauge('search.results_count', resultsCount, {
      attributes: {
        type: searchType,
      },
    });

    // Track query time if provided
    if (queryTime !== undefined) {
      Sentry.metrics.distribution('search.query_time', queryTime, {
        unit: 'millisecond',
        attributes: {
          type: searchType,
        },
      });
    }
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking search:', error);
  }
}

/**
 * Track file operations
 * 
 * @param operation - File operation (upload, download, delete)
 * @param fileType - Type of file (image, pdf, document)
 * @param sizeMB - File size in megabytes
 * @param duration - Operation duration in milliseconds (optional)
 */
export function trackFileOperation(
  operation: 'upload' | 'download' | 'delete',
  fileType: string,
  sizeMB: number,
  duration?: number
) {
  if (!isMetricsEnabled()) return;

  try {
    // Count file operations
    Sentry.metrics.count('file.operation', 1, {
      attributes: {
        operation,
        file_type: fileType,
      },
    });

    // Track file size
    Sentry.metrics.distribution('file.size', sizeMB, {
      unit: 'megabyte',
      attributes: {
        operation,
        file_type: fileType,
      },
    });

    // Track operation duration if provided
    if (duration !== undefined) {
      Sentry.metrics.distribution('file.operation_time', duration, {
        unit: 'millisecond',
        attributes: {
          operation,
          file_type: fileType,
        },
      });
    }
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking file operation:', error);
  }
}

/**
 * Track external API calls
 * 
 * @param serviceName - Name of external service (stripe, twilio, sendgrid)
 * @param operation - Operation performed
 * @param success - Whether the operation was successful
 * @param duration - Operation duration in milliseconds (optional)
 */
export function trackExternalApiCall(
  serviceName: string,
  operation: string,
  success: boolean,
  duration?: number
) {
  if (!isMetricsEnabled()) return;

  try {
    // Count external API calls
    Sentry.metrics.count('external_api.call', 1, {
      attributes: {
        service: serviceName,
        operation,
        success: success.toString(),
      },
    });

    // Track duration if provided
    if (duration !== undefined) {
      Sentry.metrics.distribution('external_api.duration', duration, {
        unit: 'millisecond',
        attributes: {
          service: serviceName,
          operation,
        },
      });
    }
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking external API call:', error);
  }
}

/**
 * Track cache operations
 * 
 * @param operation - Cache operation (hit, miss, set, delete)
 * @param cacheKey - Cache key prefix or type
 */
export function trackCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'delete',
  cacheKey: string
) {
  if (!isMetricsEnabled()) return;

  try {
    Sentry.metrics.count('cache.operation', 1, {
      attributes: {
        operation,
        cache_key: cacheKey,
      },
    });
  } catch (error) {
    console.error('[Sentry Metrics] Error tracking cache operation:', error);
  }
}

/**
 * Flush all pending metrics immediately
 * Useful before process termination or at critical checkpoints
 * 
 * @param timeout - Maximum time to wait for flush (milliseconds)
 */
export async function flushMetrics(timeout: number = 2000): Promise<void> {
  if (!isMetricsEnabled()) return;

  try {
    await Sentry.flush(timeout);
    console.log('[Sentry Metrics] Metrics flushed successfully');
  } catch (error) {
    console.error('[Sentry Metrics] Error flushing metrics:', error);
  }
}
