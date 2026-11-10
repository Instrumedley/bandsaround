import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["next-auth"],
  turbopack: {
    root: path.join(__dirname),
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "next-auth/core": path.join(__dirname, "node_modules/next-auth/core/index.js"),
    };
    return config;
  },
};

export default nextConfig;
