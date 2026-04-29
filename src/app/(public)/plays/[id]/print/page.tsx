import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/plays/print-button";
import Link from "next/link";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const play = await prisma.palettePlay.findUnique({
    where: { id },
    select: { title: true },
  });
  if (!play) return { title: "作品が見つかりません" };
  return { title: `${play.title} - 印刷用` };
}

export default async function PrintPlayPage({ params }: Props) {
  const { id } = await params;

  const play = await prisma.palettePlay.findUnique({
    where: { id },
  });

  if (!play || !play.isPublished) {
    notFound();
  }

  // Get author name
  const authors = await prisma.$queryRaw<
    any[]
  >`SELECT "displayName" FROM "public"."User" WHERE id = ${play.authorId}`;
  const authorName = authors[0]?.displayName ?? "不明";

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print { display: none !important; }
              header, footer, nav { display: none !important; }
              .flex.min-h-screen { display: block !important; }
              body {
                font-family: "Shippori Mincho", "游明朝", "YuMincho", serif;
                font-size: 11pt;
                line-height: 1.8;
                color: #000;
              }
              .print-page {
                max-width: none !important;
                padding: 0 !important;
                margin: 0 !important;
              }
            }
            @page {
              size: A4;
              margin: 20mm;
            }
          `,
        }}
      />
      <div className="print-page mx-auto max-w-3xl px-4 py-8">
        {/* Controls - hidden when printing */}
        <div className="no-print mb-8 flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
          <PrintButton />
          <Link
            href={`/plays/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← 作品ページに戻る
          </Link>
        </div>

        {/* Title */}
        <h1 className="mb-2 text-center font-serif text-3xl font-bold">
          {play.title}
        </h1>

        {/* Author */}
        <p className="mb-8 text-center text-lg text-muted-foreground">
          作：{authorName}
        </p>

        <hr className="my-6" />

        {/* Meta info */}
        <div className="mb-6 flex justify-between text-sm text-muted-foreground">
          <span>上演時間：{play.durationMinutes}分</span>
          <span>出演：{play.castTotal}人</span>
        </div>

        {/* Synopsis */}
        <div className="mb-8">
          <h2 className="mb-2 font-serif text-xl font-semibold">あらすじ</h2>
          <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {play.synopsis}
          </p>
        </div>

        <hr className="my-6" />

        {/* Body */}
        <div
          className="font-serif leading-loose"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {play.body || "（本文未登録）"}
        </div>

        {/* Print footer */}
        <div className="mt-12 border-t pt-4 text-center text-xs text-muted-foreground">
          戯曲パレット - {play.title}
        </div>
      </div>
    </>
  );
}
