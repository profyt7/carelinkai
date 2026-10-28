type CacheEntry = { expires: number; data: any };

const cache = new Map<string, CacheEntry>();

export async function fetchJsonCached(
  url: string,
  init: RequestInit = {},
  ttlMs = 15000
) {
  try {
    const now = Date.now();
    const hit = cache.get(url);
    if (hit && hit.expires > now) {
      return hit.data;
    }
    const res = await fetch(url, init);
    const data = await res.json();
    cache.set(url, { expires: now + ttlMs, data });
    return data;
  } catch (e) {
    // On error, do not poison cache; rethrow
    throw e;
  }
}

export function clearFetchCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
