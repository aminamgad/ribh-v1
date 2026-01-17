/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable standalone build for cPanel deployment
  images: {
    domains: ['res.cloudinary.com', 'localhost', 'via.placeholder.com', 'portfolio.roeia.com'],
    formats: ['image/webp', 'image/avif'],
    // Cache optimized remote images for longer; images rarely change after upload
    minimumCacheTTL: 86400,
  },
  experimental: {
    serverComponentsExternalPackages: ['cloudinary'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/api/upload',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'POST, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/upload',
        destination: '/api/upload',
      },
    ];
  },
};

module.exports = nextConfig; 