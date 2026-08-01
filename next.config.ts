import type { NextConfig } from "next";

const nextConfig: any = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  allowedDevOrigins: ['127.0.0.1', 'localhost:3000'],
};

export default nextConfig;
