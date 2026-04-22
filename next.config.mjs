/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    // Makes image optimization faster on Railway
    optimizePackageImports: [],
  },
};

export default nextConfig;
