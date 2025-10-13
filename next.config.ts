import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better error handling
  reactStrictMode: true,

  // ESLint configuration
  eslint: {
    // Relax some rules during build for deployment
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Don't fail build on TS errors during deployment (log them only)
    ignoreBuildErrors: false,
  },

  // Turbopack configuration
  turbopack: {
    root: process.cwd(),
  },

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Production optimizations
  compress: true,

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
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
        ],
      },
    ];
  },
};

export default nextConfig;
