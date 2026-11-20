/**
 * fetch() with a few retries for failures that are worth retrying: no response at all (network error,
 * a server restarting mid-request) and 5xx / 408 / 429. A 4xx answer (e.g. 404) is final and returned as is.
 * Defaults: 3 attempts, waiting 500 ms then 1500 ms between them.
 */
export type FetchRetryOptions = {
  attempts?: number;
  /** Delay before retry n (1-based). */
  delayMs?: (retry: number) => number;
  /** For tests. */
  sleep?: (ms: number) => Promise<void>;
  fetchImpl?: typeof fetch;
};

export const isRetryableStatus = (status: number) => status >= 500 || status === 408 || status === 429;

const defaultDelay = (retry: number) => 500 * Math.pow(3, retry - 1); // 500, 1500, 4500…
const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchWithRetry(input: string, init?: RequestInit, opts: FetchRetryOptions = {}): Promise<Response> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const delay = opts.delayMs ?? defaultDelay;
  const sleep = opts.sleep ?? defaultSleep;
  const doFetch = opts.fetchImpl ?? fetch;
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await doFetch(input, init);
      if (!isRetryableStatus(res.status) || i === attempts) return res;
    } catch (e) {
      if ((e as { name?: string })?.name === 'AbortError') throw e; // cancelled on purpose: don't retry
      lastError = e;
      if (i === attempts) throw e;
    }
    await sleep(delay(i));
  }
  throw lastError ?? new Error('fetchWithRetry: no attempts made');
}
