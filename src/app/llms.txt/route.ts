/**
 * GET /llms.txt — plain-text overview for AI agents (sprint W3 item 6c).
 * Content lives in src/lib/seo/llms-txt.ts. Public, cacheable, listed in
 * robots.txt, excluded from the auth middleware matcher.
 */

import { buildLlmsTxt } from '@/lib/seo/llms-txt';

export const dynamic = 'force-static';

export function GET() {
  return new Response(buildLlmsTxt(), {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
