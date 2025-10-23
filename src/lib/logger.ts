import pino from 'pino';

const redact = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'request.headers.authorization',
    'request.headers.cookie',
    'user.password',
    'user.ssn',
    'metadata.*',
  ],
  censor: '[Redacted]'
};

const baseLogger: any = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  transport: process.env['NODE_ENV'] === 'development' ? { target: 'pino-pretty' } : undefined,
  redact,
  base: undefined,
});

// Backward-compatible wrapper (keeps existing call sites working)
const wrapper = {
  debug: (...args: any[]) => baseLogger.debug(...(args as any)),
  info: (...args: any[]) => baseLogger.info(...(args as any)),
  warn: (...args: any[]) => baseLogger.warn(...(args as any)),
  error: (...args: any[]) => baseLogger.error(...(args as any)),
};

// Structured child logger with context bindings
export function getLogger(bindings?: Record<string, any>) {
  return bindings ? baseLogger.child(bindings) : baseLogger;
}

// Create a child logger bound to request and tracing context
export function bindRequestLogger(req: Request | { headers: Headers }) {
  let reqId: string | undefined;
  try { reqId = (req as any)?.headers?.get?.('x-request-id') || undefined; } catch {}

  let traceId: string | undefined;
  try {
    // Lazy import to avoid bundling issues in edge/client
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const api = require('@opentelemetry/api');
    const span = api.trace.getSpan(api.context.active());
    const ctx = span && (span.context?.() || span.spanContext?.());
    traceId = ctx?.traceId;
  } catch {}

  const bindings: Record<string, any> = {};
  if (reqId) bindings['reqId'] = reqId;
  if (traceId) bindings['traceId'] = traceId;
  return getLogger(bindings);
}

export const logger = wrapper;
export default wrapper;