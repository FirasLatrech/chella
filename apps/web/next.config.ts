import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a minimal server and only the node_modules
  // actually reached — the production image copies that instead of the whole
  // dependency tree.
  output: "standalone",
};

export default nextConfig;
