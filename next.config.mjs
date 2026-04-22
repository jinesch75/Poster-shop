/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
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
