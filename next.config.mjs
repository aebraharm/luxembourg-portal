/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['node:sqlite', 'bcryptjs'],
  },
};

export default nextConfig;
