import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gikyokutosyokan-public.s3.ap-northeast-1.amazonaws.com",
      },
      {
        // Google OAuth アバター
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // 許可証PDF生成 (api/permissions/[id]/certificate) が
  // public/fonts/noto-sans-jp/*.woff を fs 経由で読むため、
  // Vercel Lambda バンドルに含める。
  outputFileTracingIncludes: {
    "/api/permissions/[id]/certificate": [
      "./public/fonts/noto-sans-jp/**",
    ],
  },
};

export default nextConfig;
