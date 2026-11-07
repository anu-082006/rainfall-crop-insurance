import type { NextConfig } from "next";
import path from "path";

// Fallback to WebAssembly SWC for Node 24 / Windows compatibility
if (!process.env.NEXT_TEST_WASM_DIR) {
  process.env.NEXT_TEST_WASM_DIR = path.resolve(__dirname, "node_modules/@next/swc-wasm-nodejs");
}

const nextConfig: NextConfig = {
  // Disable floating Next.js 15 devTools indicator overlay in development
  devIndicators: false,
  webpack: (config) => {
    // Disable disk caching on Windows to avoid file-lock EPERM collisions
    config.cache = false;
    return config;
  },
};

export default nextConfig;
