// Sentry utilities for crons, metrics, and AI monitoring
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

/**
 * Monitor a cron job execution
 * @param monitorSlug - Unique identifier for the cron job
 * @param callback - The function to execute
 * @returns The result of the callback
 */
export async function withCronMonitor<T>(
  monitorSlug: string,
  callback: () => Promise<T>
): Promise<T> {
  const checkInId = Sentry.captureCheckIn({
    monitorSlug,
    status: 'in_progress',
  });

  try {
    const result = await callback();
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: 'ok',
    });
    return result;
  } catch (error) {
    Sentry.captureCheckIn({
      checkInId,
      monitorSlug,
      status: 'error',
    });
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Create a cron monitor configuration
 * @param monitorSlug - Unique identifier for the cron job
 * @param schedule - Cron schedule (e.g., '0 * * * *' for hourly)
 * @param options - Additional monitor options
 */
export function createCronMonitor(
  monitorSlug: string,
  schedule: string,
  options?: {
    checkinMargin?: number;
    maxRuntime?: number;
    timezone?: string;
  }
) {
  return Sentry.captureCheckIn(
    {
      monitorSlug,
      status: 'in_progress',
    },
    {
      schedule: {
        type: 'crontab',
        value: schedule,
      },
      checkinMargin: options?.checkinMargin ?? 5,
      maxRuntime: options?.maxRuntime ?? 60,
      timezone: options?.timezone ?? 'America/Los_Angeles',
    }
  );
}

/**
 * Increment a counter metric
 * @param name - Metric name
 * @param value - Value to add (default: 1)
 * @param tags - Optional tags
 */
export function incrementMetric(
  name: string,
  value: number = 1,
  tags?: Record<string, string>
) {
  Sentry.metrics.increment(name, value, { tags });
}

/**
 * Set a gauge metric
 * @param name - Metric name
 * @param value - Current value
 * @param tags - Optional tags
 */
export function setGauge(
  name: string,
  value: number,
  tags?: Record<string, string>
) {
  Sentry.metrics.gauge(name, value, { tags });
}

/**
 * Record a distribution metric
 * @param name - Metric name
 * @param value - Value to record
 * @param unit - Unit of measurement
 * @param tags - Optional tags
 */
export function recordDistribution(
  name: string,
  value: number,
  unit: 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'byte' | 'kilobyte' | 'megabyte' | 'none' = 'none',
  tags?: Record<string, string>
) {
  Sentry.metrics.distribution(name, value, { tags, unit });
}

/**
 * Measure timing for an operation
 * @param name - Metric name for timing
 * @param callback - The function to measure
 * @param tags - Optional tags
 * @returns The result of the callback
 */
export async function measureTiming<T>(
  name: string,
  callback: () => Promise<T>,
  tags?: Record<string, string>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await callback();
    const duration = performance.now() - start;
    recordDistribution(name, duration, 'millisecond', tags);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    recordDistribution(name, duration, 'millisecond', { ...tags, error: 'true' });
    throw error;
  }
}

/**
 * Add breadcrumb for AI operations
 * @param operation - The AI operation being performed
 * @param data - Additional data about the operation
 */
export function addAIBreadcrumb(
  operation: string,
  data?: Record<string, unknown>
) {
  Sentry.addBreadcrumb({
    category: 'ai',
    message: operation,
    level: 'info',
    data,
  });
}

/**
 * Track AI model usage
 * @param modelName - Name of the AI model
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param duration - Duration of the call in milliseconds
 */
export function trackAIUsage(
  modelName: string,
  inputTokens: number,
  outputTokens: number,
  duration: number
) {
  incrementMetric('ai.calls', 1, { model: modelName });
  incrementMetric('ai.input_tokens', inputTokens, { model: modelName });
  incrementMetric('ai.output_tokens', outputTokens, { model: modelName });
  recordDistribution('ai.duration', duration, 'millisecond', { model: modelName });
}

/**
 * Set user context for Sentry
 * @param userId - User ID
 * @param email - User email
 * @param role - User role
 */
export function setUserContext(
  userId: string,
  email?: string,
  role?: string
) {
  Sentry.setUser({
    id: userId,
    email,
    ...(role && { role }),
  });
}

/**
 * Clear user context (for logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Capture a message with context
 * @param message - The message to capture
 * @param level - Severity level
 * @param context - Additional context
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  context?: Record<string, unknown>
) {
  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Capture an exception with context
 * @param error - The error to capture
 * @param context - Additional context
 */
export function captureError(
  error: Error | unknown,
  context?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    extra: context,
  });
}
