import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      hmrRefreshes: true,
      fullUrl: true,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.jsdelivr.net",
        pathname: "/gh/**",
      },
      {
        protocol: "https",
        hostname: "img.icons8.com",
        pathname: "/**", // <-- allow all paths and query params
      },
      {
        protocol: "https",
        hostname: "getumbrel.github.io",
        pathname: "/umbrel-apps-gallery/**",
      },
    ],
  },
};

export default nextConfig;
