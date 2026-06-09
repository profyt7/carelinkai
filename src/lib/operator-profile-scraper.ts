/**
 * src/lib/operator-profile-scraper.ts
 *
 * Fetches HTML from an operator's facility website for AI profile extraction.
 * - Respects robots.txt
 * - 30-second timeout
 * - File-based cache keyed by URL hash (CLI use only — skip cache in server context)
 * - Categorises failures as TRANSIENT (retry) or PERMANENT (skip)
 */

import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const BOT_USER_AGENT =
  'CareLinkAI Operator Profile Bot (profyt7@gmail.com) - auto-populating claimed-listing profile';
const FETCH_TIMEOUT_MS = 30_000;

export type ScrapeErrorCategory = 'TRANSIENT' | 'PERMANENT';
export type ScrapeFailureReason = 'BLOCKED' | 'NOT_FOUND' | 'JS_ONLY' | 'TIMEOUT' | 'INVALID_URL' | 'OTHER';

export class ScrapeError extends Error {
  constructor(
    public readonly category: ScrapeErrorCategory,
    message: string,
    public readonly reason?: ScrapeFailureReason,
  ) {
    super(message);
    this.name = 'ScrapeError';
  }
}

export interface ImageCandidate {
  url: string;
  altText: string | null;
  contextHint: string | null;
}

export interface ScrapeResult {
  url: string;
  finalUrl: string;
  html: string;
  fetchedAt: string;
  statusCode: number;
  fromCache: boolean;
  imageCandidates: ImageCandidate[];
}

// ── Robots.txt ────────────────────────────────────────────────────────────────

async function isAllowedByRobots(targetUrl: string): Promise<boolean> {
  try {
    const base = new URL(targetUrl);
    const robotsUrl = `${base.protocol}//${base.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { 'User-Agent': BOT_USER_AGENT },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return true; // missing robots.txt → allow
    return parseRobotsTxt(await res.text(), base.pathname || '/');
  } catch {
    return true; // network error reading robots.txt → allow (conservative)
  }
}

function parseRobotsTxt(content: string, urlPath: string): boolean {
  const lines = content.split(/\r?\n/);
  const blocks: { agents: string[]; disallow: string[]; allow: string[] }[] = [];
  let current: { agents: string[]; disallow: string[]; allow: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.split('#')[0].trim();
    if (!line) {
      if (current) { blocks.push(current); current = null; }
      continue;
    }
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const val = line.slice(colon + 1).trim();

    if (key === 'user-agent') {
      if (!current) current = { agents: [], disallow: [], allow: [] };
      current.agents.push(val.toLowerCase());
    } else if (key === 'disallow' && current && val) {
      current.disallow.push(val);
    } else if (key === 'allow' && current && val) {
      current.allow.push(val);
    }
  }
  if (current) blocks.push(current);

  // Prefer our specific UA block, fall back to wildcard
  const specific = blocks.find(b => b.agents.includes('carelinkai'));
  const wildcard = blocks.find(b => b.agents.includes('*'));
  const active = specific ?? wildcard;
  if (!active) return true;

  const matchesPath = (rule: string) => urlPath.startsWith(rule);
  const denied = active.disallow.some(matchesPath);
  const explicitly_allowed = active.allow.some(matchesPath);
  return !denied || explicitly_allowed;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

function urlCacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

function readCache(url: string, cacheDir: string): ScrapeResult | null {
  try {
    const file = path.join(cacheDir, `${urlCacheKey(url)}.json`);
    if (!existsSync(file)) return null;
    return { ...JSON.parse(readFileSync(file, 'utf-8')), fromCache: true };
  } catch {
    return null;
  }
}

function writeCache(result: Omit<ScrapeResult, 'fromCache'>, cacheDir: string): void {
  try {
    mkdirSync(cacheDir, { recursive: true });
    const file = path.join(cacheDir, `${urlCacheKey(result.url)}.json`);
    writeFileSync(file, JSON.stringify(result, null, 2));
  } catch {
    // non-fatal
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface ScrapeOptions {
  useCache?: boolean;
  cacheDir?: string;
}

export async function scrapeOperatorWebsite(
  url: string,
  { useCache = true, cacheDir }: ScrapeOptions = {},
): Promise<ScrapeResult> {
  const resolvedCacheDir =
    cacheDir ?? path.join(process.cwd(), 'scripts', 'scraped-cache');

  // Validate URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ScrapeError('PERMANENT', `Invalid URL: ${url}`, 'INVALID_URL');
  }

  // Cache check
  if (useCache) {
    const cached = readCache(url, resolvedCacheDir);
    if (cached) {
      // Older cache entries (pre photo-extraction) won't have imageCandidates —
      // recompute from the cached HTML so callers always get a populated array.
      return {
        ...cached,
        imageCandidates:
          cached.imageCandidates ?? extractImageCandidates(cached.html, cached.finalUrl),
      };
    }
  }

  // Robots.txt check
  const allowed = await isAllowedByRobots(url);
  if (!allowed) {
    throw new ScrapeError('PERMANENT', `robots.txt disallows crawling ${url}`, 'BLOCKED');
  }

  // Fetch
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': BOT_USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'follow',
    });
  } catch (e: any) {
    if (e?.name === 'AbortError' || e?.name === 'TimeoutError') {
      throw new ScrapeError('PERMANENT', `Timeout fetching ${url}`, 'TIMEOUT');
    }
    throw new ScrapeError('TRANSIENT', `Network error fetching ${url}: ${e?.message ?? e}`);
  }

  const { status } = response;
  const finalUrl = response.url || url;

  if (status === 404 || status === 410) {
    throw new ScrapeError('PERMANENT', `${status} at ${url}`, 'NOT_FOUND');
  }
  if (status === 403 || status === 401 || status === 429) {
    throw new ScrapeError('PERMANENT', `Blocked (${status}) at ${url}`, 'BLOCKED');
  }
  if (status === 503 || status === 502) {
    throw new ScrapeError('PERMANENT', `Anti-bot / WAF (${status}) at ${url}`, 'BLOCKED');
  }
  if (!response.ok) {
    throw new ScrapeError('TRANSIENT', `HTTP ${status} at ${url}`);
  }

  const html = await response.text();

  // Detect JS-only SPAs: body exists but has very little text content
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  const bodyContent = bodyMatch?.[1] ?? html;
  const visibleText = bodyContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (html.length > 1_000 && visibleText.length < 200) {
    throw new ScrapeError('PERMANENT', `JS-only SPA detected at ${url} (${visibleText.length} visible chars)`, 'JS_ONLY');
  }

  const result: Omit<ScrapeResult, 'fromCache'> = {
    url,
    finalUrl,
    html,
    fetchedAt: new Date().toISOString(),
    statusCode: status,
    imageCandidates: extractImageCandidates(html, finalUrl),
  };

  if (useCache) writeCache(result, resolvedCacheDir);

  return { ...result, fromCache: false };
}

// ── HTML pre-processing for AI extraction ─────────────────────────────────────

const MAX_HTML_CHARS = 80_000;

/** Strip scripts/styles/metadata, keep semantic text content, truncate. */
export function prepareHtmlForExtraction(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{3,}/g, '  ')
    .slice(0, MAX_HTML_CHARS);
}

// ── Image candidate extraction (Task 1) ────────────────────────────────────────

const MAX_IMAGE_CANDIDATES = 12;

// Substrings in src/alt/class/id that strongly imply non-facility imagery.
const IMG_BLOCK_KEYWORDS = [
  'logo', 'icon', 'badge', 'award', 'favicon', 'sprite', 'spacer', 'pixel',
  'facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'pinterest',
  'social', 'avatar', 'placeholder', 'loading', 'spinner', 'arrow', 'chevron',
];

// Domains that host stock / placeholder / tracking images, never facility photos.
const STOCK_IMAGE_HOSTS = [
  'placehold.co', 'placeholder.com', 'via.placeholder.com', 'placekitten.com',
  'unsplash.com', 'images.unsplash.com', 'pexels.com', 'pixabay.com',
  'gravatar.com', 'googletagmanager.com', 'google-analytics.com',
  'doubleclick.net', 'facebook.com', 'fbcdn.net', 'gstatic.com',
];

/** Read an HTML attribute value from a single tag string (case-insensitive). */
function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = re.exec(tag);
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? '').trim() || null;
}

/** Pick the largest URL from a srcset attribute ("url 320w, url2 640w" or "url 1x, url2 2x"). */
function pickFromSrcset(srcset: string): string | null {
  const entries = srcset
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [u, descriptor] = s.split(/\s+/, 2);
      const w = descriptor && /(\d+)w/.exec(descriptor);
      const x = descriptor && /([\d.]+)x/.exec(descriptor);
      const weight = w ? parseInt(w[1], 10) : x ? parseFloat(x[1]) * 1000 : 0;
      return { url: u, weight };
    })
    .filter((e) => e.url);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b.weight - a.weight);
  return entries[0].url;
}

/** Resolve a possibly-relative URL against the page's final URL; null if unusable. */
function resolveUrl(raw: string, baseUrl: string): string | null {
  const src = raw.trim();
  if (!src || src.startsWith('data:') || src.startsWith('javascript:')) return null;
  try {
    const resolved = new URL(src, baseUrl);
    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
    return resolved.toString();
  } catch {
    return null;
  }
}

function isBlockedByKeyword(haystack: string): boolean {
  const lower = haystack.toLowerCase();
  return IMG_BLOCK_KEYWORDS.some((kw) => lower.includes(kw));
}

function isStockHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return STOCK_IMAGE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Extract candidate facility-photo URLs from raw HTML.
 *
 * Heuristic, regex-based (no DOM): we drop <nav>/<header>/<footer> blocks, then
 * scan remaining <img> tags. Handles lazy-loading (data-src / srcset). Images
 * declared smaller than 300x200 via width/height attrs are skipped as
 * likely icons. Background-image CSS is out of scope (lower yield on those).
 *
 * Returns up to 12 de-duplicated candidates; downstream AI filtering trims to 8.
 */
export function extractImageCandidates(html: string, baseUrl: string): ImageCandidate[] {
  // Remove chrome regions that almost never contain facility photos.
  const body = html
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');

  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();

  const imgTagRe = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgTagRe.exec(body)) !== null) {
    const tag = match[0];

    // Resolve a usable source, preferring eager src then common lazy-load attrs.
    const srcset = getAttr(tag, 'srcset') || getAttr(tag, 'data-srcset');
    const rawSrc =
      getAttr(tag, 'src') ||
      getAttr(tag, 'data-src') ||
      getAttr(tag, 'data-lazy-src') ||
      getAttr(tag, 'data-original') ||
      (srcset ? pickFromSrcset(srcset) : null);
    if (!rawSrc) continue;

    const url = resolveUrl(rawSrc, baseUrl);
    if (!url || seen.has(url)) continue;

    if (isStockHost(url)) continue;

    const alt = getAttr(tag, 'alt');
    const cls = getAttr(tag, 'class') ?? '';
    const id = getAttr(tag, 'id') ?? '';

    // Keyword blocklist across src path, alt, class, id.
    const meta = `${url} ${alt ?? ''} ${cls} ${id}`;
    if (isBlockedByKeyword(meta)) continue;

    // Dimension filter — only when explicit numeric width/height attrs exist.
    const wAttr = getAttr(tag, 'width');
    const hAttr = getAttr(tag, 'height');
    const w = wAttr && /^\d+$/.test(wAttr) ? parseInt(wAttr, 10) : null;
    const h = hAttr && /^\d+$/.test(hAttr) ? parseInt(hAttr, 10) : null;
    if ((w !== null && w < 300) || (h !== null && h < 200)) continue;

    seen.add(url);
    candidates.push({
      url,
      altText: alt,
      contextHint: (cls || id) ? `${cls} ${id}`.trim() : null,
    });

    if (candidates.length >= MAX_IMAGE_CANDIDATES) break;
  }

  return candidates;
}
