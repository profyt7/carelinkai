/**
 * Boot-time Prisma warm-up (src/lib/prisma-warmup.ts): connects once, reports
 * timing, and NEVER throws — a slow or missing DB must not stop the server
 * from booting.
 */

jest.mock('@/lib/prisma', () => ({ prisma: { $connect: jest.fn(async () => undefined) } }));

import { prisma } from '@/lib/prisma';
import { warmPrisma, PRISMA_WARMUP_TIMEOUT_MS } from '@/lib/prisma-warmup';

describe('warmPrisma', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('connects the shared client once and reports ok', async () => {
    const result = await warmPrisma();
    expect(prisma.$connect).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    expect(result.ms).toBeGreaterThanOrEqual(0);
  });

  it('swallows connection errors (boot continues)', async () => {
    const failing = { $connect: jest.fn(async () => { throw new Error("Can't reach database server"); }) };
    const result = await warmPrisma(failing);
    expect(result).toMatchObject({ ok: false, reason: 'error', message: expect.stringContaining('reach database') });
  });

  it('gives up after the timeout without rejecting', async () => {
    const hanging = { $connect: jest.fn(() => new Promise<void>(() => undefined)) };
    const result = await warmPrisma(hanging, 20);
    expect(result).toMatchObject({ ok: false, reason: 'timeout' });
    expect(result.ms).toBeGreaterThanOrEqual(15);
  });

  it('default timeout is generous but bounded', () => {
    expect(PRISMA_WARMUP_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000);
    expect(PRISMA_WARMUP_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});
