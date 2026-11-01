import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // yoga-layout（@react-pdf/renderer のレイアウトエンジン）は Next.js で束ねず、そのまま読み込む。
  // Cloudflare Workers 向けに patches/ で load.js を差し替えていて、OpenNext の束ね方（.wasm を wrangler に渡す）に乗せるため
  serverExternalPackages: ["yoga-layout"],
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
};

export default nextConfig;
