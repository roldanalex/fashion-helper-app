import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static onboarding site (public/welcome) gets a clean URL.
  async rewrites() {
    return [{ source: "/welcome", destination: "/welcome/index.html" }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;
