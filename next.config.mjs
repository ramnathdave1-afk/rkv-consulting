/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warnings don't fail the build (errors still do)
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
