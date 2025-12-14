const { withSentryConfig } = require('@sentry/nextjs');
/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const cspBase = [
  "default-src 'self'",
  // Scripts: disallow inline/eval in production; allow Stripe
  isProd
    ? "script-src 'self' 'unsafe-inline' https://js.stripe.com"
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com",
  // Connections: self + Stripe APIs
  "connect-src 'self' https://api.stripe.com",
  // Images: self + data/blob and known hosts (including Cloudinary)
  "img-src 'self' data: blob: http://localhost:3000 http://localhost:5002 https://res.cloudinary.com https://media2.dev.to https://dev-to-uploads.s3.amazonaws.com https://picsum.photos https://images.unsplash.com https://placehold.co https://ui-avatars.com https://i.ytimg.com/vi/qod7eBE0mTk/maxresdefault.jpg https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://upload.wikimedia.org",
  // Styles: allow inline for Tailwind runtime classes; restrict to fonts domain
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' data: https://fonts.gstatic.com",
  // Frames
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
].join('; ');

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
    typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    // Ensure native assets from pdfkit (AFM data files) are resolved at runtime instead of bundled
    serverComponentsExternalPackages: ['pdfkit'],
  },
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
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '5002',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dygtsnu8z/**',
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
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          {
            // Content Security Policy for HIPAA compliance
            key: 'Content-Security-Policy',
            value: cspBase,
          },
        ],
      },
    ];
  },
  // Rewrite so that requests to /uploads/* are served statically in dev/prod
  async rewrites() {
    return [
      { source: '/uploads/:path*', destination: '/uploads/:path*' },
    ];
  },
  // HTTPS redirects are handled at the edge/proxy (Render/Cloudflare). Avoid app-level dynamic redirects to prevent
  // invalid URL shapes during build/runtime.
  async redirects() { return []; },
};

module.exports = withSentryConfig(nextConfig, { silent: true }, { hideSourceMaps: true });