import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// This function can be marked `async` if using `await` inside
export default withAuth(
  // `withAuth` augments your Request with the user's token
  function middleware(req) {
    try {
      // Allow unauthenticated access during E2E runs (never in production)
      if (process.env['NODE_ENV'] !== 'production' && process.env['NEXT_PUBLIC_E2E_AUTH_BYPASS'] === '1') {
        const res = NextResponse.next();
        return applySecurityHeaders(req, res);
      }
      // Or via explicit header for test runners
      if (process.env['NODE_ENV'] !== 'production' && req.headers.get('x-e2e-bypass') === '1') {
        const res = NextResponse.next();
        return applySecurityHeaders(req, res);
      }
      const { pathname } = req.nextUrl;

      /* ------------------------------------------------------------------
       * EXTRA SAFETY-NET:
       * Even though we limit the matcher (see below) we also short-circuit
       * here in case Next.js’ matcher still lets a public path through.
       * ---------------------------------------------------------------- */
      const publicPaths = [
        '/',                        // marketing / landing page
        '/search',                  // public search page
      ];

      if (publicPaths.includes(pathname)) {
        const res = NextResponse.next();
        return applySecurityHeaders(req, res);
      }

      // (Any other custom logic could live here)
      const res = NextResponse.next();
      return applySecurityHeaders(req, res);
    } catch (err) {
      /* istanbul ignore next */
      console.error('Middleware error:', err);
      // On error let the request continue instead of crashing
      const res = NextResponse.next();
      return applySecurityHeaders(req, res);
    }
  },
  {
    callbacks: {
      // The middleware runs when the authorized callback returns `true`
      authorized({ req, token }) {
        // E2E bypass via env flag or explicit header
        try {
          if (process.env['NODE_ENV'] !== 'production' && process.env['NEXT_PUBLIC_E2E_AUTH_BYPASS'] === '1') return true;
          // Some Next versions expose headers on req.headers
          const headerVal = req?.headers?.get?.('x-e2e-bypass');
          if (process.env['NODE_ENV'] !== 'production' && headerVal === '1') return true;
        } catch {}
        // If there is a token, the user is authenticated
        return !!token;
      },
    },
    // If the user is not authenticated, redirect to login page
    pages: {
      signIn: '/auth/login',
    },
  }
);

// Specify which routes this middleware should run on
export const config = {
  // Include all routes except those that are public
  matcher: [
    /* ---------------------------------------------------------------
     *  Only match routes that should be protected.  We exclude:
     *   - Root landing page "/"
     *   - Any path starting with /api , /_next , /static , /public
     *   - All auth related routes
     *   - PWA assets: sw.js, manifest.json, offline.html
     * ------------------------------------------------------------- */
    // Require at least ONE character after the leading slash so "/" itself is excluded
    '/((?!api|_next|static|public|favicon\\.ico|auth|sw\\.js|manifest\\.json|offline\\.html).+)',
  ],
};

/**
 * Apply security headers (CSP, HSTS, etc.)
 */
function applySecurityHeaders(req: Request, res: NextResponse) {
  const isProd = process.env['NODE_ENV'] === 'production';

  // Strict-Transport-Security (HSTS) - only in production
  if (isProd) {
    res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  // Common security headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set(
    'Permissions-Policy',
    [
      "geolocation=(self)",
      "camera=()",
      "microphone=()",
      "payment=(self)",
      "fullscreen=(self)",
      "accelerometer=()",
      "autoplay=(self)",
      "clipboard-read=(self)",
      "clipboard-write=(self)",
    ].join(', ')
  );

  // Content-Security-Policy (relaxed in development to avoid tooling issues)
  const cspParts = [
    "default-src 'self'",
    // Allow Next.js inline styles; tighten in prod if hashed
    isProd ? "style-src 'self' 'unsafe-inline'" : "style-src 'self' 'unsafe-inline'",
    // Scripts: allow self; allow unsafe-eval in dev for React Refresh
    isProd ? "script-src 'self'" : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    // Images from self, data URIs, and https
    "img-src 'self' data: blob: https:",
    // Fonts
    "font-src 'self' data: https:",
    // Connections (API, websockets for dev)
    isProd ? "connect-src 'self' https:" : "connect-src 'self' ws: wss: http: https:",
    // Media
    "media-src 'self'",
    // Frames
    "frame-ancestors 'none'",
    // Workers
    "worker-src 'self' blob:",
    // Base URI
    "base-uri 'self'",
    // Form actions
    "form-action 'self'"
  ];

  // Do not set CSP for Next.js assets routes to avoid duplication issues
  const url = new URL((req as any).url);
  const path = url.pathname;
  const skipCsp = path.startsWith('/_next') || path.startsWith('/api');
  if (!skipCsp) {
    res.headers.set('Content-Security-Policy', cspParts.join('; '));
  }

  return res;
}
