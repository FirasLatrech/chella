import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a minimal server and only the node_modules
  // actually reached — the production image copies that instead of the whole
  // dependency tree. Vercel does its own build tracing and this conflicts
  // with it, so skip it there (Vercel sets VERCEL=1).
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
