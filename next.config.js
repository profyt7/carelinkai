/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force new build ID on each deployment for cache busting
  generateBuildId: async () => {
    // Use timestamp + random string to ensure unique build ID
    return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  },
  
  // Existing Next.js config
  reactStrictMode: true,
  swcMinify: true,
  
  // Add cache busting headers to prevent browser caching
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
