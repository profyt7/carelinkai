/**
 * fetchWithRetry: retries a dropped connection and 5xx/408/429 (3 attempts, backoff), never a 4xx,
 * and never retries a deliberate abort.
 */
import { fetchWithRetry, isRetryableStatus } from '@/lib/http/fetch-retry';

const res = (status: number) => new Response('{}', { status });
const netErr = () => Object.assign(new TypeError('Failed to fetch'), {});

function harness(outcomes: Array<number | 'net'>) {
  const calls: string[] = [];
  const sleeps: number[] = [];
  const fetchImpl = jest.fn(async (url: string) => {
    calls.push(url);
    const o = outcomes.shift();
    if (o === 'net' || o === undefined) throw netErr();
    return res(o);
  }) as unknown as typeof fetch;
  const sleep = async (ms: number) => { sleeps.push(ms); };
  return { calls, sleeps, opts: { fetchImpl, sleep } };
}

it('a dropped connection then success: retried, returns the good response', async () => {
  const h = harness(['net', 200]);
  const r = await fetchWithRetry('/api/homes/h1', undefined, h.opts);
  expect(r.status).toBe(200);
  expect(h.calls).toHaveLength(2);
  expect(h.sleeps).toEqual([500]);
});

it('5xx twice then success: three attempts with 500 ms and 1500 ms backoff', async () => {
  const h = harness([503, 502, 200]);
  expect((await fetchWithRetry('/x', undefined, h.opts)).status).toBe(200);
  expect(h.calls).toHaveLength(3);
  expect(h.sleeps).toEqual([500, 1500]);
});

it('a 404 is final: no retry', async () => {
  const h = harness([404, 200]);
  expect((await fetchWithRetry('/x', undefined, h.opts)).status).toBe(404);
  expect(h.calls).toHaveLength(1);
  expect(h.sleeps).toEqual([]);
});

it('gives up after 3 attempts: returns the last 5xx, or rethrows the last network error', async () => {
  let h = harness([500, 500, 500, 200]);
  expect((await fetchWithRetry('/x', undefined, h.opts)).status).toBe(500);
  expect(h.calls).toHaveLength(3);
  h = harness(['net', 'net', 'net']);
  await expect(fetchWithRetry('/x', undefined, h.opts)).rejects.toThrow('Failed to fetch');
  expect(h.calls).toHaveLength(3);
});

it('an abort is not retried', async () => {
  const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
  const fetchImpl = jest.fn(async () => { throw abort; }) as unknown as typeof fetch;
  await expect(fetchWithRetry('/x', undefined, { fetchImpl, sleep: async () => undefined })).rejects.toBe(abort);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

it('which statuses are retryable', () => {
  expect([500, 502, 503, 504, 408, 429].every(isRetryableStatus)).toBe(true);
  expect([200, 400, 401, 403, 404].some(isRetryableStatus)).toBe(false);
});
