/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['res.cloudinary.com', 'localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  i18n: {
    locales: ['ar'],
    defaultLocale: 'ar',
    localeDetection: false,
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
    ];
  },
  // Disable serverless functions for Vercel
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  // Disable styled-jsx for Vercel
  compiler: {
    styledComponents: false,
  },
  // Add webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    // Disable styled-jsx
    config.resolve.alias = {
      ...config.resolve.alias,
      'styled-jsx/style': false,
    };
    return config;
  },
  // Disable styled-jsx completely
  swcMinify: true,
};

export default nextConfig; 