import { NextRequest, NextResponse } from "next/server";
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
import fs from "node:fs";
import path from "node:path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";

// 日本語フォント (通常/太字)。public/fonts に同梱したファイルを
// モジュールロード時に Data URL に変換して Font.register に渡す。
// jsDelivr 経由だと毎回フェッチで Vercel Lambda がタイムアウトしていた。
// @react-pdf/renderer の `src` は URL / 絶対パス / Data URL を受け付け、
// Buffer は受け付けないため Data URL 化が必須。
const FONT_DIR = path.join(process.cwd(), "public/fonts/noto-sans-jp");
function loadFontDataUrl(filename: string): string {
  const buf = fs.readFileSync(path.join(FONT_DIR, filename));
  return `data:font/woff;base64,${buf.toString("base64")}`;
}
Font.register({
  family: "NotoSansJP",
  fonts: [
    { src: loadFontDataUrl("regular.woff"), fontWeight: "normal" },
    { src: loadFontDataUrl("bold.woff"), fontWeight: "bold" },
  ],
});

// Lambda タイムアウトを長めに（フォント embed + PDF render）。
export const maxDuration = 60;

const styles = StyleSheet.create({
  // ---- ページ ----
  // padding を大きめに取って、fixed 枠の内側に収まるようにする
  page: {
    paddingTop: 60,
    paddingBottom: 60,
    paddingHorizontal: 60,
    fontFamily: "NotoSansJP",
    fontSize: 11,
    color: "#1f2937",
    backgroundColor: "#ffffff",
  },

  // ---- 全ページ共通の装飾枠 (fixed) ----
  outerBorder: {
    position: "absolute",
    top: 30,
    bottom: 30,
    left: 30,
    right: 30,
    border: "2 solid #c0392b",
  },
  innerBorder: {
    position: "absolute",
    top: 36,
    bottom: 36,
    left: 36,
    right: 36,
    border: "0.5 solid #c0392b",
  },

  // ---- ヘッダー ----
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  brand: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#6b7280",
  },
  permissionNumber: {
    fontSize: 10,
    color: "#6b7280",
    textAlign: "right",
  },
  permissionNumberValue: {
    fontSize: 12,
    fontFamily: "Courier",
    color: "#1f2937",
    marginTop: 2,
  },

  // ---- タイトル ----
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    letterSpacing: 16,
    color: "#1f2937",
    marginTop: 12,
    marginBottom: 6,
  },
  titleEn: {
    fontSize: 10,
    textAlign: "center",
    letterSpacing: 6,
    color: "#9ca3af",
    marginBottom: 14,
  },
  divider: {
    alignSelf: "center",
    width: 60,
    height: 1,
    backgroundColor: "#c0392b",
    marginBottom: 22,
  },

  // ---- 作品情報 ----
  workBlock: {
    alignItems: "center",
    marginBottom: 20,
  },
  workLabel: {
    fontSize: 9,
    letterSpacing: 3,
    color: "#9ca3af",
    marginBottom: 6,
  },
  workTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  workAuthor: {
    fontSize: 12,
    color: "#4b5563",
    textAlign: "center",
  },

  // ---- 詳細行 ----
  detailsSection: {
    marginTop: 6,
    marginBottom: 18,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottom: "0.5 solid #e5e7eb",
  },
  rowLabel: {
    width: 80,
    flexShrink: 0,
    fontSize: 10,
    color: "#6b7280",
    paddingTop: 1,
  },
  rowValueWrap: {
    flex: 1,
    flexDirection: "column",
  },
  rowValue: {
    fontSize: 11,
    color: "#111827",
    lineHeight: 1.4,
  },
  rowSub: {
    fontSize: 9,
    color: "#6b7280",
    marginTop: 3,
    lineHeight: 1.4,
  },

  // ---- 宣言文・発行・印影 ----
  statement: {
    marginTop: 6,
    fontSize: 11,
    textAlign: "center",
    color: "#1f2937",
    lineHeight: 1.8,
  },
  signatureBlock: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    marginTop: 24,
    gap: 16,
  },
  issueBlock: {
    alignItems: "flex-end",
  },
  issueDate: {
    fontSize: 11,
    color: "#111827",
    marginBottom: 4,
  },
  issuer: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },
  stamp: {
    width: 70,
    height: 70,
    borderRadius: 35,
    border: "2 solid #c0392b",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  stampText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#c0392b",
    letterSpacing: 1,
  },
  stampTextSub: {
    fontSize: 7,
    color: "#c0392b",
    marginTop: 2,
    letterSpacing: 1,
  },

  // ---- ページ番号 / フッター (全ページ共通) ----
  pageNumber: {
    position: "absolute",
    bottom: 14,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
  },
});

type CertInput = {
  permissionNumber: string;
  playTitle: string;
  authorName: string;
  organizationName: string;
  representativeName: string;
  performanceTitle: string;
  startDate: Date;
  endDate: Date;
  venueName: string;
  venueLocation: string;
  numPerformances: number;
  expectedAudience: number;
  feeAmount: number;
  isFree: boolean;
  issuedAt: Date;
};

function CertificatePDF(c: CertInput) {
  const h = React.createElement;
  const fmtDate = (d: Date) => formatDate(d);
  const feeText = c.isFree ? "無料" : `¥${c.feeAmount.toLocaleString()}`;

  // 値が複数行になる可能性のあるもの。長文でも Text 内で折り返す。
  const rows: Array<{ label: string; value: string; sub?: string }> = [
    {
      label: "上演団体",
      value: c.organizationName,
      sub: `代表者：${c.representativeName}`,
    },
    { label: "公演名", value: c.performanceTitle },
    {
      label: "公演期間",
      value: `${fmtDate(c.startDate)} 〜 ${fmtDate(c.endDate)}`,
    },
    { label: "会場", value: c.venueName, sub: c.venueLocation },
    {
      label: "上演回数",
      value: `${c.numPerformances}回`,
      sub: `想定観客 ${c.expectedAudience.toLocaleString()}人`,
    },
    { label: "上演料", value: feeText },
  ];

  return h(
    Document,
    null,
    h(
      Page,
      { size: "A4", style: styles.page, wrap: true },

      // 全ページ共通の装飾枠
      h(View, { style: styles.outerBorder, fixed: true }),
      h(View, { style: styles.innerBorder, fixed: true }),

      // ページ番号 (2ページ以上のときに意味を持つ)
      // @react-pdf/renderer 側で `render` prop の型が公開されておらず as による回避が必要。
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      h(Text as React.ComponentType<any>, {
        style: styles.pageNumber,
        fixed: true,
        render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          totalPages > 1
            ? `戯曲パレット 上演許可証 ・ ${pageNumber} / ${totalPages}`
            : "戯曲パレット (gikyoku-palette.com) が発行する上演許可証です",
      }),

      // ===== ヘッダー =====
      h(
        View,
        { style: styles.header },
        h(Text, { style: styles.brand }, "GIKYOKU PALETTE"),
        h(
          View,
          { style: { alignItems: "flex-end" } },
          h(Text, { style: styles.permissionNumber }, "Permission No."),
          h(Text, { style: styles.permissionNumberValue }, c.permissionNumber)
        )
      ),

      // ===== タイトル =====
      h(Text, { style: styles.title }, "上演許可証"),
      h(Text, { style: styles.titleEn }, "PERMISSION TO PERFORM"),
      h(View, { style: styles.divider }),

      // ===== 作品情報 =====
      h(
        View,
        { style: styles.workBlock, wrap: false },
        h(Text, { style: styles.workLabel }, "WORK"),
        h(Text, { style: styles.workTitle }, c.playTitle),
        h(Text, { style: styles.workAuthor }, `作：${c.authorName}`)
      ),

      // ===== 詳細行 =====
      h(
        View,
        { style: styles.detailsSection },
        ...rows.map((r, i) =>
          h(
            View,
            { key: String(i), style: styles.row, wrap: false },
            h(Text, { style: styles.rowLabel }, r.label),
            h(
              View,
              { style: styles.rowValueWrap },
              h(Text, { style: styles.rowValue }, r.value),
              r.sub ? h(Text, { style: styles.rowSub }, r.sub) : null
            )
          )
        )
      ),

      // ===== 宣言文 =====
      h(
        Text,
        { style: styles.statement },
        "上記の内容にて、本作品の上演を許可いたします。"
      ),

      // ===== 発行情報 + 印影 (最後のブロック) =====
      h(
        View,
        { style: styles.signatureBlock, wrap: false },
        h(
          View,
          { style: styles.issueBlock },
          h(
            Text,
            { style: styles.issueDate },
            `発行日：${fmtDate(c.issuedAt)}`
          ),
          h(Text, { style: styles.issuer }, "戯曲パレット")
        ),
        h(
          View,
          { style: styles.stamp },
          h(Text, { style: styles.stampText }, "許可"),
          h(Text, { style: styles.stampTextSub }, "APPROVED")
        )
      )
    )
  );
}

async function getUserDisplayName(id: string): Promise<string> {
  const users = await prisma.$queryRaw<Array<{ displayName: string }>>`
    SELECT "displayName" FROM "public"."User" WHERE id = ${id}
  `;
  return users[0]?.displayName || "不明";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await prisma.palettePermission.findUnique({
    where: { id },
    include: { play: true },
  });

  if (!permission || permission.status !== "permitted") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (
    permission.applicantId !== session.user.id &&
    permission.play.authorId !== session.user.id
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authorName = await getUserDisplayName(permission.play.authorId);

  try {
    const pdfBuffer = await renderToBuffer(
      React.createElement(CertificatePDF, {
        permissionNumber: permission.permissionNumber || "—",
        playTitle: permission.play.title,
        authorName,
        organizationName: permission.organizationName,
        representativeName: permission.representativeName,
        performanceTitle: permission.performanceTitle,
        startDate: permission.startDate,
        endDate: permission.endDate,
        venueName: permission.venueName,
        venueLocation: permission.venueLocation,
        numPerformances: permission.numPerformances,
        expectedAudience: permission.expectedAudience,
        feeAmount: permission.feeAmount,
        isFree: permission.play.isFree,
        issuedAt:
          permission.paidAt || permission.reviewedAt || permission.createdAt,
      // renderToBuffer の React 型と @react-pdf/renderer の Document 型がズレるためキャスト
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any
    );

    return new Response(Buffer.from(pdfBuffer) as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/pdf",
        // `<a download>` でファイル名が "certificate.txt" にならないよう
        // attachment で明示する。
        "Content-Disposition": `attachment; filename="permission-${permission.permissionNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Certificate PDF generation error:", error);
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return NextResponse.json(
      { error: "許可証PDFの生成に失敗しました。", detail },
      { status: 500 }
    );
  }
}
