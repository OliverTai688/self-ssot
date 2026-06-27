import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: true,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
