import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@tensorflow/tfjs-node", "@vladmandic/face-api"],
};

export default nextConfig;
