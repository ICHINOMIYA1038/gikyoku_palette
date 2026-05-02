import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
  const authors = await prisma.$queryRaw<
    any[]
  >`SELECT "displayName" FROM "public"."User" WHERE id = ${play.authorId}`;
  const authorName = authors[0]?.displayName ?? "不明";

  // Increment download count (raw SQL to avoid updating updated_at)
  await prisma.$executeRaw`
    UPDATE palette.palette_plays
    SET download_count = download_count + 1
    WHERE id = ${id}`;

  const content = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${play.title}
作：${authorName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

あらすじ：
${play.synopsis}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${play.body}`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(play.title)}.txt"`,
    },
  });
}
