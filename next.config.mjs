/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // AVIF removed deliberately. It is the most memory- and CPU-expensive
    // encode Next supports, and it was responsible for a p99 latency of
    // ~14s against a p50 of 51ms. WebP gets within a few percent of the
    // same file size for a fraction of the cost.
    formats: ['image/webp'],
    // Previews are already pre-rendered at 1200px by lib/watermark.ts, so
    // when anything does go through the optimizer there is no reason to
    // re-encode it hourly for crawlers. 30 days.
    minimumCacheTTL: 2592000,
  },
  experimental: {
    optimizePackageImports: [],
    // Poster masters run 20–40 MB. Raise the server-action body limit so
    // the admin upload flow accepts real files.
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  // sharp lives in node_modules — ensure it's not bundled into client code.
  serverExternalPackages: ['sharp', '@prisma/client'],
};

export default nextConfig;
