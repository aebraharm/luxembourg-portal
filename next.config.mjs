/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client', '@netlify/blobs', 'bcryptjs'],
  },
};

export default nextConfig;
