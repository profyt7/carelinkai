/**
 * Boot-time Prisma warm-up (sprint W2 item 6 — cold-start p95).
 *
 * Why: Sentry's 7-day p95 showed `prisma:client:detect_platform` at 8.9 s
 * inside the FIRST request a fresh instance served (/auth/register 1.8 s,
 * /learn/howto/[slug] 3.8 s). In Prisma 6 that span wraps
 * `getBinaryTargetForCurrentPlatform()`, which spawns `ldd` / `openssl version`
 * child processes to pick the engine file. `binaryTargets` is already pinned
 * in prisma/schema.prisma ("debian-openssl-3.0.x") — Prisma still runs the
 * detection once per client instance regardless; the pin only guarantees the
 * matching engine ships. On a cold, CPU-starved instance, with several clients
 * initialising concurrently on the first requests (each spawning its own
 * probes — the memoised result is not shared until the first probe finishes),
 * that is where the seconds went.
 *
 * Fix: run the detection + engine load + first connection ONCE, at process
 * boot, from instrumentation.ts (`register()`), before the server takes
 * traffic. With one shared client (src/lib/prisma.ts) no request ever pays it
 * again.
 *
 * Never throws: a slow / unavailable DB at boot must not crash the server —
 * the first real query will reconnect on its own.
 */

import { prisma } from '@/lib/prisma';

export const PRISMA_WARMUP_TIMEOUT_MS = 15_000;

export type WarmupResult =
  | { ok: true; ms: number }
  | { ok: false; ms: number; reason: 'timeout' | 'error'; message?: string };

export async function warmPrisma(
  client: { $connect: () => Promise<void> } = prisma,
  timeoutMs: number = PRISMA_WARMUP_TIMEOUT_MS
): Promise<WarmupResult> {
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs);
    // never keep the process alive for this
    (timer as { unref?: () => void }).unref?.();
  });

  try {
    const outcome = await Promise.race([client.$connect().then(() => 'connected' as const), timeout]);
    const ms = Date.now() - started;
    if (outcome === 'timeout') {
      console.warn(`[Prisma warm-up] still connecting after ${timeoutMs} ms — continuing boot; first query will finish the handshake`);
      return { ok: false, ms, reason: 'timeout' };
    }
    console.log(`[Prisma warm-up] engine loaded + connected in ${ms} ms`);
    return { ok: true, ms };
  } catch (err) {
    const ms = Date.now() - started;
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[Prisma warm-up] failed after ${ms} ms (continuing boot): ${message}`);
    return { ok: false, ms, reason: 'error', message };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
