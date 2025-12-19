import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Diary',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
