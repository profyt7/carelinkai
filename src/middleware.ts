import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

// This function can be marked `async` if using `await` inside
export default withAuth(
  // `withAuth` augments your Request with the user's token
  function middleware(req) {
    try {
      // Allow unauthenticated access during E2E runs (never in production)
      if (process.env['NODE_ENV'] !== 'production' && process.env['NEXT_PUBLIC_E2E_AUTH_BYPASS'] === '1') {
        return NextResponse.next();
      }
      // Or via explicit header for test runners
      if (process.env['NODE_ENV'] !== 'production' && req.headers.get('x-e2e-bypass') === '1') {
        return NextResponse.next();
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
        return NextResponse.next();
      }

      // (Any other custom logic could live here)
      return NextResponse.next();
    } catch (err) {
      /* istanbul ignore next */
      console.error('Middleware error:', err);
      // On error let the request continue instead of crashing
      return NextResponse.next();
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
