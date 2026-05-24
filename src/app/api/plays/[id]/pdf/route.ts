// サーバサイド PDF 生成（作品閲覧用ダウンロード）。
// 執筆エディタからのエクスポートは jsPDF（src/lib/editor/export-pdf.ts）。
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

// Register Japanese font (Noto Sans JP)
Font.register({
  family: "NotoSansJP",
  src: "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.1/files/noto-sans-jp-japanese-400-normal.woff",
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontFamily: "NotoSansJP",
    fontSize: 11,
    lineHeight: 1.8,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginBottom: 10,
  },
  author: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 30,
    color: "#666",
  },
  separator: {
    borderBottom: "1 solid #ccc",
    marginVertical: 20,
  },
  synopsisLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
  },
  synopsis: {
    fontSize: 11,
    marginBottom: 20,
    color: "#444",
  },
  body: {
    fontSize: 11,
    lineHeight: 1.8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
  meta: {
    fontSize: 10,
    color: "#666",
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
});

function PlayPDF({
  play,
  authorName,
}: {
  play: {
    title: string;
    synopsis: string;
    body: string | null;
    durationMinutes: number | null;
    castTotal: number | null;
  };
  authorName: string;
}) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.title }, play.title),
      React.createElement(
        Text,
        { style: styles.author },
        `作：${authorName}`
      ),
      React.createElement(View, { style: styles.separator }),
      React.createElement(
        View,
        { style: styles.metaRow },
        React.createElement(
          Text,
          { style: styles.meta },
          `上演時間：${play.durationMinutes != null ? `${play.durationMinutes}分` : "未定"}`
        ),
        React.createElement(
          Text,
          { style: styles.meta },
          `出演：${play.castTotal != null ? `${play.castTotal}人` : "未定"}`
        )
      ),
      React.createElement(Text, { style: styles.synopsisLabel }, "あらすじ"),
      React.createElement(Text, { style: styles.synopsis }, play.synopsis),
      React.createElement(View, { style: styles.separator }),
      React.createElement(
        Text,
        { style: styles.body },
        play.body || "（本文未登録）"
      ),
      React.createElement(
        Text,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { style: styles.footer, fixed: true } as any,
        `戯曲パレット - ${play.title}`
      )
    )
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const play = await prisma.palettePlay.findUnique({
    where: { id },
  });

  if (!play || !play.isPublished) {
    return NextResponse.json(
      { error: "作品が見つかりません" },
      { status: 404 }
    );
  }

  if (!play.body) {
    return NextResponse.json(
      { error: "この作品にはダウンロード可能な本文がありません" },
      { status: 400 }
    );
  }

  // Get author name via raw SQL
  const authors = await prisma.$queryRaw<Array<{ displayName: string | null }>>`
    SELECT "displayName" FROM "public"."User" WHERE id = ${play.authorId}
  `;
  const authorName = authors[0]?.displayName ?? "不明";

  try {
    const pdfBuffer = await renderToBuffer(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      React.createElement(PlayPDF, { play, authorName }) as any
    );

    return new Response(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(play.title)}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      {
        error:
          "PDF生成に失敗しました。印刷ページをご利用ください。",
      },
      { status: 500 }
    );
  }
}
