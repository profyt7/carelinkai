/**
 * OL-226 / OL-229: GA4 receives funnel events and page views server-side, through the
 * Measurement Protocol, built only from already-sanitized data. No Google script runs in
 * the browser, so GA never sees the visitor's URL (no `?q=`), referrer, title, IP or
 * cookies, and GA4 Enhanced Measurement (history page views, site search) can't fire.
 *
 * Config (server env, fails closed when either is missing):
 *   GA_MEASUREMENT_ID (or NEXT_PUBLIC_GA_MEASUREMENT_ID)  — the GA4 web stream id
 *   GA_MP_API_SECRET  — GA Admin › Data streams › (stream) › Measurement Protocol API secrets
 * GA_MP_ENDPOINT overrides the Google endpoint only outside production or with
 * ALLOW_DEV_ENDPOINTS=1 (e2e points it at a local capture server).
 */
import { sanitizePath } from './sanitize';
import type { FunnelEventName } from './events';
import { errorSummary } from '@/lib/log-safe';

export const GA_MP_DEFAULT_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
export const PAGE_VIEW = 'page_view';

export type MpEventName = FunnelEventName | typeof PAGE_VIEW;

type MpConfig = { measurementId: string; apiSecret: string; endpoint: string };

export function gaMpConfig(env: NodeJS.ProcessEnv = process.env): MpConfig | null {
  const measurementId = env.GA_MEASUREMENT_ID || env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
  const apiSecret = env.GA_MP_API_SECRET || '';
  if (!/^G-[A-Z0-9]{4,16}$/.test(measurementId) || !apiSecret) return null;
  const overrideOk = env.NODE_ENV !== 'production' || env.ALLOW_DEV_ENDPOINTS === '1';
  const endpoint = overrideOk && env.GA_MP_ENDPOINT ? env.GA_MP_ENDPOINT : GA_MP_DEFAULT_ENDPOINT;
  return { measurementId, apiSecret, endpoint };
}

/** Stable numeric GA session id from the random per-tab id (GA wants a number). */
function sessionNumber(sid: string): string {
  let h = 0;
  for (let i = 0; i < sid.length; i++) h = (h * 31 + sid.charCodeAt(i)) >>> 0;
  return String(h);
}

/**
 * The exact JSON body GA receives. `props` must already be sanitized (sanitizeEvent /
 * sanitizePagePath); page_location is rebuilt here from the sanitized path only.
 */
export function buildMpBody(
  name: MpEventName,
  props: Record<string, unknown>,
  sid: string,
  pagePath: string | null,
  siteOrigin: string,
) {
  const params: Record<string, unknown> = { ...props, session_id: sessionNumber(sid), engagement_time_msec: 1 };
  // GA params are scalars: join list values (care_levels) into one string.
  for (const [k, v] of Object.entries(params)) if (Array.isArray(v)) params[k] = v.join(',');
  if (pagePath) {
    const path = sanitizePath(pagePath);
    params.page_location = `${siteOrigin}${path}`;
    params.page_path = path;
  }
  return { client_id: sid, non_personalized_ads: true, events: [{ name, params }] };
}

/** Fire-and-forget POST to GA. Never throws, never logs the body. */
export async function sendToGa(body: ReturnType<typeof buildMpBody>, config = gaMpConfig()): Promise<void> {
  if (!config) return;
  const url = `${config.endpoint}?measurement_id=${encodeURIComponent(config.measurementId)}&api_secret=${encodeURIComponent(config.apiSecret)}`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.error('[ga-mp] send failed', errorSummary(err));
  }
}
