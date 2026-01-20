import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@forky/app-ui",
    "@forky/ui",
    "@forky/state",
    "@forky/shared-core",
    "@forky/shared-ui",
    "@forky/config",
    "@forky/client-api",
  ],
};

export default nextConfig;
