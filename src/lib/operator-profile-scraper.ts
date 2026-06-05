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
  'CareLinkAI Operator Profile Bot (profyt7@gmail.com) — auto-populating claimed-listing profile';
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

export interface ScrapeResult {
  url: string;
  finalUrl: string;
  html: string;
  fetchedAt: string;
  statusCode: number;
  fromCache: boolean;
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
    if (cached) return cached;
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
