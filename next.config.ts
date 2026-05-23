import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "mongoose", "@napi-rs/canvas", "canvas"],
};

export default nextConfig;
