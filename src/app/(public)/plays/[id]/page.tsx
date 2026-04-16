import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPlayById, incrementViewCount } from "@/actions/plays";
import { prisma } from "@/lib/db";
import { DownloadButton } from "@/components/plays/download-button";
import { ReviewSection } from "@/components/reviews/review-section";
import { truncateText } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { Clock, Users, Banknote, Eye, Download, Star, AlertTriangle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PdfViewer } from "@/components/plays/pdf-viewer";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const play = await getPlayById(id);
  if (!play) return { title: "作品が見つかりません" };

  return {
    title: play.title,
    description: truncateText(play.synopsis, 160),
    openGraph: {
      title: `${play.title} | 戯曲パレット`,
      description: truncateText(play.synopsis, 160),
      type: "article",
    },
  };
}

function MetaRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-gray-50">
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value}</p>
      </div>
    </div>
  );
}

export default async function PlayDetailPage({ params }: Props) {
  const { id } = await params;
  const play = await getPlayById(id);

  if (!play || !play.isPublished) {
    notFound();
  }

  // Increment view count (fire and forget)
  incrementViewCount(id);

  const authorName = play.author?.displayName ?? "不明な作者";
  const genres = play.genres.map((pg) => pg.genre.name);

  // 有料作品で作家の Stripe Connect 連携が未完なら、申請者に注意喚起する
  let authorStripeReady = true;
  if (!play.isFree && play.feeAmount > 0 && play.author?.id) {
    const stripeAccount = await prisma.paletteStripeAccount.findUnique({
      where: { userId: play.author.id },
      select: { onboardingCompleted: true },
    });
    authorStripeReady = !!stripeAccount?.onboardingCompleted;
  }

  return (
    <div>
      {/* Hero Section */}
      {play.coverImageUrl ? (
        <div className="relative h-64 md:h-80 w-full">
          <Image
            src={play.coverImageUrl}
            alt={play.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 container mx-auto max-w-5xl px-4 pb-6">
            <h1 className="text-2xl md:text-3xl font-bold font-serif text-white">
              {play.title}
            </h1>
            <p className="text-white/80 text-sm mt-1">{authorName}</p>
          </div>
        </div>
      ) : (
        <div className="border-b border-gray-100">
          <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {genres.map((genre) => (
                  <span
                    key={genre}
                    className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold font-serif text-gray-900">
              {play.title}
            </h1>
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
              <Link
                href={`/authors/${play.author?.id}`}
                className="hover:text-pink-600 transition-colors"
              >
                {authorName}
              </Link>
              {play.avgRating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium text-gray-700">{play.avgRating.toFixed(1)}</span>
                  <span className="text-gray-400">({play.reviewCount}件)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content - 2カラム: あらすじ + サイドバー */}
      <div className="container mx-auto max-w-5xl px-4 py-8 md:py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column */}
          <div className="lg:w-2/3 space-y-8">
            <div>
              <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
                あらすじ
              </h2>
              <p className="text-gray-700 leading-relaxed">{play.synopsis}</p>
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="lg:w-1/3">
            <div className="lg:sticky lg:top-20 space-y-6">
              {/* Action Buttons */}
              <div className="space-y-3">
                <DownloadButton playId={play.id} title={play.title} hasBody={!!play.body || !!play.bodyPdfUrl} bodyType={play.bodyType || "text"} bodyPdfUrl={play.bodyPdfUrl} />
                <Link
                  href={`/permissions/new/${play.id}`}
                  className="w-full inline-flex h-11 items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  上演許可を申請する
                </Link>
                {!authorStripeReady && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs">
                    <p className="flex items-start gap-1.5 text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>
                        執筆者の決済受取設定が未完です。申請は受け付けますが、
                        承認後の上演料お支払いは執筆者の設定完了後となります。
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="rounded-lg border border-gray-200 p-5 space-y-4">
                <h3 className="text-sm font-medium text-gray-900">作品情報</h3>
                <MetaRow icon={Clock} label="上演時間" value={`${play.durationMinutes}分`} />
                <MetaRow icon={Users} label="出演人数" value={`${play.castTotal}人`} />
                <MetaRow
                  icon={Banknote}
                  label="上演料"
                  value={play.isFree ? "無料" : `¥${play.feeAmount.toLocaleString()}`}
                />
                <MetaRow icon={Eye} label="閲覧数" value={`${play.viewCount.toLocaleString()}回`} />
                <MetaRow icon={Download} label="ダウンロード" value={`${play.downloadCount}回`} />

                {/* Genres */}
                {genres.length > 0 && (
                  <div className="pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-2">ジャンル</p>
                    <div className="flex flex-wrap gap-1.5">
                      {genres.map((genre) => (
                        <span
                          key={genre}
                          className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Author Card */}
              <div className="rounded-lg border border-gray-200 p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">執筆者</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
                    {authorName?.slice(0, 1)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{authorName}</p>
                    <Link
                      href={`/authors/${play.author?.id}`}
                      className="text-xs text-gray-400 hover:text-pink-600 transition-colors"
                    >
                      作品一覧を見る →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 台本セクション - 全幅 */}
      {(play.bodyType === "pdf" && play.bodyPdfUrl) || play.body ? (
        <div className="container mx-auto max-w-5xl px-4 pb-8">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">台本</h2>
          {play.bodyType === "pdf" && play.bodyPdfUrl ? (
            <PdfViewer src={play.bodyPdfUrl} title={play.title} orientation={play.bodyOrientation as "portrait" | "landscape"} />
          ) : (
            <PdfViewer src={`/api/plays/${play.id}/pdf`} title={play.title} orientation={play.bodyOrientation as "portrait" | "landscape"} />
          )}
        </div>
      ) : null}

      {/* レビューセクション - 全幅 */}
      <div className="container mx-auto max-w-5xl px-4 pb-12">
        <ReviewSection playId={play.id} authorId={play.authorId} />
      </div>
    </div>
  );
}
