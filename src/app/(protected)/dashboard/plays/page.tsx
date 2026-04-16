import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Eye, FileText, Pen } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { TogglePublishButton } from "./toggle-publish-button";

export const metadata = { title: "作品管理" };

export default async function DashboardPlaysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const plays = await prisma.palettePlay.findMany({
    where: { authorId: session.user.id },
    include: {
      genres: { include: { genre: true } },
      _count: { select: { permissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-serif font-bold text-gray-900">
          作品管理
        </h1>
        <Link
          href="/dashboard/plays/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          新規投稿
        </Link>
      </div>

      {plays.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">まだ作品がありません。</p>
          <Link
            href="/dashboard/plays/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-4 w-4" />
            最初の作品を投稿する
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {plays.map((play) => (
            <div
              key={play.id}
              className="rounded-lg border border-gray-200 p-4 flex items-center justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 truncate">
                    {play.title}
                  </p>
                  <Badge variant={play.isPublished ? "default" : "secondary"}>
                    {play.isPublished ? "公開中" : "非公開"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {play.viewCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {play._count.permissions}件
                  </span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link
                  href={`/dashboard/plays/${play.id}/edit`}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Pen className="h-3.5 w-3.5" />
                  編集
                </Link>
                <TogglePublishButton
                  playId={play.id}
                  isPublished={play.isPublished}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
