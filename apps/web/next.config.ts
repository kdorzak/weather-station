import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Optional but often helpful on Pages:
  images: { unoptimized: true },
};

export default nextConfig;