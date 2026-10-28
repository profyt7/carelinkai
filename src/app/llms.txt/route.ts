/**
 * GET /llms.txt — plain-text overview for AI agents (sprint W3 item 6c).
 * Content lives in src/lib/seo/llms-txt.ts. Public, cacheable, listed in
 * robots.txt, excluded from the auth middleware matcher.
 */

import { buildLlmsTxt } from '@/lib/seo/llms-txt';

// OL-159: static, but rebuilt at least hourly and on demand (POST /api/admin/revalidate).
export const revalidate = 3600;

export function GET() {
  return new Response(buildLlmsTxt(), {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
