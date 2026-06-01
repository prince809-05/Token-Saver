import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["pdfjs-dist"]
  }
};

export default nextConfig;
