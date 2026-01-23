import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      hmrRefreshes: true,
      fullUrl: true,
    },
  },
  images: {
    // Allow Umbrel gallery icons/screenshots and other common CDN sources
    remotePatterns: [
      { protocol: "https", hostname: "getumbrel.github.io", pathname: "/umbrel-apps-gallery/**" },
      { protocol: "https", hostname: "getumbrel.com", pathname: "/**" },
      { protocol: "https", hostname: "img.icons8.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.jsdelivr.net", pathname: "/gh/**" },
      { protocol: "https", hostname: "github.com", pathname: "/**" },
      { protocol: "https", hostname: "foldingathome.org", pathname: "/**" },
      { protocol: "https", hostname: "raw.githubusercontent.com", pathname: "/**" },
      { protocol: "https", hostname: "raw.fastgit.org", pathname: "/**" },
      { protocol: "https", hostname: "raw.githack.com", pathname: "/**" },
      { protocol: "https", hostname: "ghproxy.com", pathname: "/**" },
      { protocol: "https", hostname: "raw.kgithub.com", pathname: "/**" },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
};

export default nextConfig;
