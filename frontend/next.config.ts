import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: false,
  },
  typescript: {
    // Vérifié séparément par `tsc --noEmit`; évite le worker TypeScript
    // instable de Next 16 dans certains environnements CI.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
