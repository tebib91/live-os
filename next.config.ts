import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      hmrRefreshes: true,
      fullUrl: true,
    },
  },
  // images: {
  //   remotePatterns: [
  //     // Explicit allow-list for common hosts used in imported manifests
  //     { protocol: "https", hostname: "github.com", pathname: "/**" },
  //     { protocol: "https", hostname: "foldingathome.org", pathname: "/**" },
  //     {
  //       protocol: "https",
  //       hostname: "img.icons8.com",
  //       pathname: "/**", // <-- allow all paths and query params
  //     },
  //     {
  //       protocol: "https",
  //       hostname: "raw.githubusercontent.com",
  //       pathname: "/**",
  //     },
  //     { protocol: "https", hostname: "raw.fastgit.org", pathname: "/**" },
  //     { protocol: "https", hostname: "raw.githack.com", pathname: "/**" },
  //     { protocol: "https", hostname: "ghproxy.com", pathname: "/**" },
  //     { protocol: "https", hostname: "raw.kgithub.com", pathname: "/**" },
  //   ],
  // },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
