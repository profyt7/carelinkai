import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { withAuth } from 'next-auth/middleware';

/* ============================================================================
 * CRITICAL FIX FOR IMAGE OPTIMIZATION 400 ERRORS
 * ============================================================================
 * 
 * ROOT CAUSE: next-auth's withAuth wrapper was processing ALL requests,
 * including /_next/image, BEFORE our path exclusion checks could run.
 * 
 * SOLUTION: Check paths at the EARLIEST possible point, BEFORE withAuth,
 * and return immediately for Next.js internal routes.
 * 
 * This ensures /_next/image and other Next.js routes never touch the
 * authentication system at all.
 * ========================================================================== */

// Define paths that should NEVER require authentication
const PUBLIC_PATHS = [
  '/_next/',           // All Next.js internal routes (includes /_next/image, /_next/static, etc.)
  '/api/',             // API routes handle their own auth
  '/static/',          // Static assets
  '/public/',          // Public folder
  '/images/',          // Image folder
  '/uploads/',         // Upload folder
  '/favicon.ico',      // Favicon
  '/sw.js',            // Service worker
  '/manifest.json',    // PWA manifest
  '/offline.html',     // PWA offline page
];

/**
 * Check if a path should bypass all authentication
 */
function shouldBypassAuth(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => {
    if (path.endsWith('/')) {
      return pathname.startsWith(path);
    }
    return pathname === path;
  });
}

/**
 * Main middleware export - wrapped with our custom path checking logic
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* ------------------------------------------------------------------
   * FIRST LINE OF DEFENSE: Bypass auth entirely for public paths
   * This runs BEFORE withAuth can process the request
   * ---------------------------------------------------------------- */
  if (shouldBypassAuth(pathname)) {
    const res = NextResponse.next();
    return applySecurityHeaders(req, res);
  }

  /* ------------------------------------------------------------------
   * SECOND LINE OF DEFENSE: Apply withAuth for protected paths
   * Only paths that need authentication reach this point
   * ---------------------------------------------------------------- */
  return (withAuth as any)(
    function middleware(req: any) {
      try {
        const { pathname } = req.nextUrl;

        // Double-check for safety (should never reach here for public paths)
        if (shouldBypassAuth(pathname)) {
          const res = NextResponse.next();
          return applySecurityHeaders(req, res);
        }

        const urlObj = req.nextUrl;
        const qsMock = urlObj?.searchParams?.get?.('mock')?.toString().trim().toLowerCase() || '';
        const qsOn = ['1','true','yes','on'].includes(qsMock);
        const qsOff = ['0','false','no','off'].includes(qsMock);

        // Runtime mock toggle: cookie takes precedence, then SHOW_SITE_MOCKS env only
        // NOTE: NEXT_PUBLIC_SHOW_MOCK_DASHBOARD is intentionally ignored to prevent accidental enablement
        const cookieRaw = req.cookies?.get?.('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
        const cookieOn = ['1', 'true', 'yes', 'on'].includes(cookieRaw);
        const cookieOff = ['0', 'false', 'no', 'off'].includes(cookieRaw);
        const rawMock = (process.env['SHOW_SITE_MOCKS'] || '')
          .toString()
          .trim()
          .toLowerCase();
        const envOn = ['1', 'true', 'yes', 'on'].includes(rawMock);
        // Cookie explicitly off overrides everything
        let showMocks = cookieOff ? false : (cookieOn || envOn || qsOn);

        // If query string explicitly toggles mock, set cookie and strip the param
        if (qsOn || qsOff) {
          try {
            const clean = new URL(req.url);
            clean.searchParams.delete('mock');
            const redirectRes = NextResponse.redirect(clean);
            try {
              redirectRes.cookies.set('carelink_mock_mode', qsOn ? '1' : '0', {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env['NODE_ENV'] === 'production',
                path: '/',
                maxAge: qsOn ? 60 * 60 * 24 * 7 : 0,
              });
            } catch {}
            return applySecurityHeaders(req, redirectRes);
          } catch {}
          const res = NextResponse.next();
          try {
            res.cookies.set('carelink_mock_mode', qsOn ? '1' : '0', {
              httpOnly: true,
              sameSite: 'lax',
              secure: process.env['NODE_ENV'] === 'production',
              path: '/',
              maxAge: qsOn ? 60 * 60 * 24 * 7 : 0,
            });
          } catch {}
          return applySecurityHeaders(req, res);
        }

        // Allow unauthenticated access during E2E runs (never in production)
        if (process.env['NODE_ENV'] !== 'production' && process.env['NEXT_PUBLIC_E2E_AUTH_BYPASS'] === '1') {
          const res = NextResponse.next();
          try { res.cookies.set('e2e-bypass', '1', { path: '/' }); } catch {}
          return applySecurityHeaders(req, res);
        }
        if (process.env['NODE_ENV'] !== 'production' && req.headers.get('x-e2e-bypass') === '1') {
          const res = NextResponse.next();
          try { res.cookies.set('e2e-bypass', '1', { path: '/' }); } catch {}
          return applySecurityHeaders(req, res);
        }

        // Public paths that don't require authentication
        const publicPaths = [
          '/',                        // marketing / landing page
          '/search',                  // public search page
        ];

        // In mock mode, also allow marketplace and search to be publicly viewable
        const mockPublicPrefixes = ['/marketplace', '/search'];

        if (publicPaths.includes(pathname) || (showMocks && mockPublicPrefixes.some(p => pathname === p || pathname.startsWith(p + '/')))) {
          const res = NextResponse.next();
          return applySecurityHeaders(req, res);
        }

        const res = NextResponse.next();
        return applySecurityHeaders(req, res);
      } catch (err) {
        console.error('Middleware error:', err);
        const res = NextResponse.next();
        return applySecurityHeaders(req, res);
      }
    },
    {
      callbacks: {
        authorized({ req, token }: { req: any; token: any }) {
          try {
            const pathname = req?.nextUrl?.pathname || '';

            // Triple-check for public paths (defense in depth)
            if (shouldBypassAuth(pathname)) {
              return true;
            }

            // Allow public access to selected routes when runtime mock mode is enabled
            // NOTE: NEXT_PUBLIC_SHOW_MOCK_DASHBOARD intentionally ignored
            const cookieRaw = req?.cookies?.get?.('carelink_mock_mode')?.value?.toString().trim().toLowerCase() || '';
            const cookieOn = ['1', 'true', 'yes', 'on'].includes(cookieRaw);
            const cookieOff = ['0', 'false', 'no', 'off'].includes(cookieRaw);
            const qsMock = req?.nextUrl?.searchParams?.get?.('mock')?.toString().trim().toLowerCase() || '';
            const qsOn = ['1','true','yes','on'].includes(qsMock);
            const rawMock = (process.env['SHOW_SITE_MOCKS'] || '')
              .toString()
              .trim()
              .toLowerCase();
            const envOn = ['1', 'true', 'yes', 'on'].includes(rawMock);
            const showMocks = cookieOff ? false : (cookieOn || envOn || qsOn);
            if (showMocks) {
              if (pathname === '/' || pathname === '/search' || pathname.startsWith('/marketplace')) {
                return true;
              }
            }

            // E2E bypass
            if (process.env['NODE_ENV'] !== 'production' && process.env['NEXT_PUBLIC_E2E_AUTH_BYPASS'] === '1') return true;
            const headerVal = req?.headers?.get?.('x-e2e-bypass');
            if (process.env['NODE_ENV'] !== 'production' && headerVal === '1') return true;
          } catch (err) {
            console.error('authorized callback error:', err);
          }
          return !!token;
        },
      },
      pages: {
        signIn: '/auth/login',
      },
    }
  )(req);
}

// Specify which routes this middleware should run on
export const config = {
  /* ---------------------------------------------------------------
   * CRITICAL: Use a matcher that explicitly excludes Next.js routes
   * This is the FIRST line of defense to prevent the middleware from
   * even running on /_next/ paths.
   * 
   * We exclude:
   * - /_next/ (all Next.js internal routes)
   * - /api/ (API routes handle their own auth)
   * - /static/, /public/, /images/, /uploads/ (static assets)
   * - /auth/ (authentication pages)
   * - PWA assets (sw.js, manifest.json, offline.html)
   * - Common files (favicon.ico)
   * ------------------------------------------------------------- */
  matcher: [
    /*
     * Match all request paths except:
     * 1. /_next/ (Next.js internals)
     * 2. /api/ (API routes)
     * 3. /static/, /public/, /images/, /uploads/ (static files)
     * 4. /auth/ (auth pages)
     * 5. Common assets (favicon, manifest, etc.)
     */
    '/((?!_next/|api/|static/|public/|images/|uploads/|favicon\\.ico|auth/|sw\\.js|manifest\\.json|offline\\.html).*)',
  ],
};

/**
 * Apply security headers (CSP, HSTS, etc.)
 */
function applySecurityHeaders(req: any, res: NextResponse) {
  const isProd = process.env['NODE_ENV'] === 'production';
  const enableCsp = process.env['NEXT_PUBLIC_ENABLE_CSP'] === '1';

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

  // Content-Security-Policy (only enable in production to avoid dev tooling issues)
  const cspParts = [
    "default-src 'self'",
    isProd ? "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com" : "style-src 'self' 'unsafe-inline'",
    isProd ? "script-src 'self' 'unsafe-inline' https://js.stripe.com" : "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https: https://fonts.gstatic.com",
    isProd ? "connect-src 'self' https: https://js.stripe.com https://api.stripe.com" : "connect-src 'self' ws: wss: http: https:",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "base-uri 'self'",
    "form-action 'self'"
  ];

  // Do not set CSP for Next.js assets routes
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const skipCsp = path.startsWith('/_next') || path.startsWith('/api');
    if (isProd && enableCsp && !skipCsp) {
      res.headers.set('Content-Security-Policy', cspParts.join('; '));
    }
  } catch {}

  return res;
}
