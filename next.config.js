/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    // Disable optimization in development to avoid 400 errors from the _next/image
    // endpoint when serving local files from /public/uploads.
    unoptimized: process.env.NODE_ENV === 'development',
    // Add placeholder image domain used in seed data / development
    // If you add additional remote image sources, include them here
    domains: [
      'localhost',
      'carelinkai-storage.s3.amazonaws.com',
      'example.com', // allows https://example.com/home-photo.jpg
      // Additional remote image hosts used throughout the app
      'picsum.photos',
      'randomuser.me',
      'placehold.co',
      'ui-avatars.com',
      'fastly.picsum.photos',
      'images.unsplash.com',
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    formats: ['image/webp'],
    // Allow optimization of images served from the local uploads folder in development
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/uploads/**',
      },
    ],
  },
  // Removed experimental features to avoid dependency issues
  async headers() {
    const enableCsp = process.env.NEXT_PUBLIC_ENABLE_CSP === '1';
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          ...(
            enableCsp
              ? [{
                  // Content Security Policy (enable via NEXT_PUBLIC_ENABLE_CSP=1)
                  key: 'Content-Security-Policy',
                  value:
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com; " +
                    "connect-src 'self' https://api.stripe.com; " +
                    "img-src 'self' data: blob: http://localhost:3000 https://carelinkai-storage.s3.amazonaws.com " +
                    "https://picsum.photos https://randomuser.me https://placehold.co https://ui-avatars.com " +
                    "https://fastly.picsum.photos " +
                    "https://images.unsplash.com " +
                    "https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org; " +
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                    "font-src 'self' data: https://fonts.gstatic.com; " +
                    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com;",
                }]
              : []
          ),
        ],
      },
    ];
  },
  // Rewrite so that requests to /uploads/* are served statically in dev/prod
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  // Redirect from HTTP to HTTPS for HIPAA compliance in production only.
  // In local Docker / dev, unconditional redirects can create invalid URL patterns
  // (e.g. https://:host/__ESC_COLON_path*) and break NextAuth.
  async redirects() {
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        permanent: true,
        destination: 'https://:host/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
