/**
 * トップページ用 OG 画像（1200x630）。
 * Twitter / Facebook / LINE などでシェアされたときのカード画像。
 */

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "戯曲パレット";

const LOGO_URL =
  "https://gikyokutosyokan-public.s3.ap-northeast-1.amazonaws.com/assets/logo-palette.png";

export default async function Image_() {
  const logoRes = await fetch(LOGO_URL);
  const logoBuffer = await logoRes.arrayBuffer();
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoBuffer).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #fdf2f8 0%, #fbcfe8 50%, #f9a8d4 100%)",
          fontFamily: "'Hiragino Mincho ProN', serif",
        }}
      >
        <img
          src={logoBase64}
          width={800}
          height={160}
          style={{ objectFit: "contain" }}
        />
        <p
          style={{
            marginTop: 32,
            fontSize: 32,
            color: "#9d174d",
            maxWidth: 900,
            textAlign: "center",
          }}
        >
          戯曲の投稿・公開・上演許可を、ワンストップで。
        </p>
        <p
          style={{
            marginTop: 48,
            fontSize: 20,
            color: "#be185d",
            letterSpacing: 4,
          }}
        >
          作家と劇団をつなぐプラットフォーム
        </p>
      </div>
    ),
    { ...size }
  );
}
