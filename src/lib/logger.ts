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

const base: any = pino({
  level: process.env['LOG_LEVEL'] || 'info',
  transport: process.env['NODE_ENV'] === 'development' ? { target: 'pino-pretty' } : undefined,
  redact,
  base: undefined,
});

const wrapper = {
  debug: (...args: any[]) => base.debug(...args as any),
  info: (...args: any[]) => base.info(...args as any),
  warn: (...args: any[]) => base.warn(...args as any),
  error: (...args: any[]) => base.error(...args as any),
};

export const logger = wrapper;
export default wrapper;