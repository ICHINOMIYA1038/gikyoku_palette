/**
 * 作家プロフィール用 OG 画像。
 * 作家名・自己紹介・作品数でシェア時の存在感を演出。
 */

import { ImageResponse } from "next/og";
import { getAuthorProfile } from "@/actions/auth";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "戯曲パレット 作家プロフィール";

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  const author = await getAuthorProfile(id);
  if (!author) return fallback();

  const name = author.displayName || "作家";
  const bio = author.bio
    ? author.bio.length > 160
      ? author.bio.slice(0, 160) + "…"
      : author.bio
    : "";
  const playCount = author.plays?.length ?? 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #fdf2f8 0%, #f9a8d4 100%)",
          fontFamily: "'Hiragino Mincho ProN', serif",
          padding: 72,
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#be185d",
            fontSize: 22,
            fontWeight: 500,
          }}
        >
          🎭 戯曲パレット ・ 作家プロフィール
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: "white",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 72,
              fontWeight: 700,
              color: "#be185d",
              border: "4px solid white",
              boxShadow: "0 4px 24px rgba(190, 24, 93, 0.2)",
            }}
          >
            {name.slice(0, 1)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#111827",
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {name}
            </p>
            {bio && (
              <p
                style={{
                  fontSize: 22,
                  color: "#4b5563",
                  margin: 0,
                  lineHeight: 1.5,
                  maxWidth: 800,
                }}
              >
                {bio}
              </p>
            )}
          </div>
        </div>

        <div style={{ fontSize: 24, color: "#6b7280", display: "flex" }}>
          <span>{`公開作品 ${playCount} 件`}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}

function fallback() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "#fdf2f8",
          fontSize: 48,
          color: "#be185d",
          fontFamily: "'Hiragino Mincho ProN', serif",
        }}
      >
        戯曲パレット
      </div>
    ),
    { ...size }
  );
}
