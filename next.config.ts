import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/landing.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
