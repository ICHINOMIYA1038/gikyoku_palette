/**
 * トップページ用 OG 画像（1200x630）。
 * Twitter / Facebook / LINE などでシェアされたときのカード画像。
 */

import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "戯曲パレット";

export default async function Image_() {
  const logoPath = join(process.cwd(), "public", "logo-palette.png");
  const logoData = await readFile(logoPath);
  const logoBase64 = `data:image/jpeg;base64,${logoData.toString("base64")}`;

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
          <img
            src={logoBase64}
            width={120}
            height={120}
            style={{ borderRadius: 16 }}
          />
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
