/**
 * 作品ページ用 OG 画像。
 * 作品タイトル・作家・主要メタを大きく見せ、シェア流入の関心を引く。
 */

import { ImageResponse } from "next/og";
import { getPlayById } from "@/actions/plays";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "戯曲パレット 作品";

type Props = { params: Promise<{ id: string }> };

export default async function Image({ params }: Props) {
  const { id } = await params;
  const play = await getPlayById(id);
  if (!play || !play.isPublished) {
    return fallback();
  }

  const author = play.author?.displayName ?? "不明な作者";
  const title = play.title || "無題";
  const synopsis = play.synopsis
    ? play.synopsis.length > 120
      ? play.synopsis.slice(0, 120) + "…"
      : play.synopsis
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)",
          fontFamily: "'Hiragino Mincho ProN', serif",
          padding: 72,
          justifyContent: "space-between",
        }}
      >
        {/* ヘッダー */}
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
          🎭 戯曲パレット
        </div>

        {/* 本文 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <p
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              lineHeight: 1.2,
              letterSpacing: "-1px",
            }}
          >
            {title}
          </p>
          <p style={{ fontSize: 28, color: "#6b7280", margin: 0 }}>
            {author}
          </p>
          {synopsis && (
            <p
              style={{
                fontSize: 22,
                color: "#4b5563",
                margin: 0,
                lineHeight: 1.5,
                maxWidth: 1000,
              }}
            >
              {synopsis}
            </p>
          )}
        </div>

        {/* メタ行 */}
        <div
          style={{
            display: "flex",
            gap: 32,
            fontSize: 22,
            color: "#6b7280",
          }}
        >
          <span>⏱ {play.durationMinutes}分</span>
          <span>👥 {play.castTotal}人</span>
          <span>
            💴 {play.isFree ? "無料" : `¥${play.feeAmount.toLocaleString()}`}
          </span>
          {play.avgRating > 0 && (
            <span>
              ★ {play.avgRating.toFixed(1)}（{play.reviewCount}件）
            </span>
          )}
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
