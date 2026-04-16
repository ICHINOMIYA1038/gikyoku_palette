/**
 * トップページ用 OG 画像（1200x630）。
 * Twitter / Facebook / LINE などでシェアされたときのカード画像。
 */

import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "戯曲パレット";

export default function Image() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 48,
            }}
          >
            🎭
          </div>
          <p style={{ fontSize: 96, fontWeight: 700, color: "#831843", margin: 0 }}>
            戯曲パレット
          </p>
        </div>
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
