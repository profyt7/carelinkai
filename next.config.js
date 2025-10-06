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
    const isProd = process.env.NODE_ENV === 'production';
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Only set HSTS in production
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
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
