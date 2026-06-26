/**
 * Production safety guard for seed scripts.
 *
 * INCIDENT (2026-06): ~11 demo/test homes (E2E Test Home, DeepAgent Test Home, Sunshine
 * Care Home, and several out-of-state city homes) leaked into the PRODUCTION directory and
 * ranked on family /search. Root cause: a demo/test seed script was run with DATABASE_URL
 * pointed at the production database. The seed scripts had no guard.
 *
 * Call assertSeedAllowed() at the very top of every seed's main(). It refuses to run unless
 * the target database host is local (localhost / 127.0.0.1) — CI seeds against a local
 * Postgres, so CI is unaffected. To deliberately seed a NON-production remote DB (e.g. a
 * staging instance), set ALLOW_PROD_SEED=1.
 */
export function assertSeedAllowed(scriptName = 'seed'): void {
  if (process.env['ALLOW_PROD_SEED'] === '1') {
    console.warn(`[seed-guard] ALLOW_PROD_SEED=1 — bypassing the production guard for "${scriptName}".`);
    return;
  }

  const url = process.env['DATABASE_URL'] || '';
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  const isProdEnv = process.env['NODE_ENV'] === 'production';

  if (!isLocal || isProdEnv) {
    console.error(
      `\n⛔ [seed-guard] Refusing to run "${scriptName}".\n` +
        `   Target DB host: "${host || '(unparseable DATABASE_URL)'}"  ·  NODE_ENV=${process.env['NODE_ENV'] ?? 'undefined'}\n` +
        `   Seed scripts create demo/test data and must NEVER touch a remote/production database.\n` +
        `   (This is the guard added after demo/test homes leaked into the production directory.)\n` +
        `   If you are intentionally seeding a NON-production remote DB, set ALLOW_PROD_SEED=1 and re-run.\n`,
    );
    process.exit(1);
  }
}
