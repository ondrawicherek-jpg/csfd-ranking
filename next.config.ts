import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright", "better-sqlite3"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.pmgstatic.com",
      },
      {
        protocol: "https",
        hostname: "**.csfd.cz",
      },
    ],
  },
};

export default nextConfig;
