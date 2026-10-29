/**
 * OL-230: what an API route may log about a caught error. Prisma validation errors and Zod
 * errors can echo the submitted values (names, emails, care notes) in their message, so route
 * handlers log only the error's class and code — never the error object, message or stack.
 * Guarded by scripts/pii-log-scan.cjs (__tests__/pii-log-guard.unit.test.ts).
 */
export function errorSummary(err: unknown): string {
  if (!err || typeof err !== 'object') return typeof err;
  const e = err as { name?: unknown; code?: unknown; constructor?: { name?: unknown } };
  const name = typeof e.name === 'string' ? e.name : typeof e.constructor?.name === 'string' ? e.constructor.name : 'Error';
  const code = typeof e.code === 'string' && /^[A-Z0-9_]{1,20}$/i.test(e.code) ? ` ${e.code}` : '';
  return `${name}${code}`;
}
